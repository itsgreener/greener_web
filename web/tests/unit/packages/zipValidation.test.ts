import { describe, it, expect } from 'vitest'
import AdmZip from 'adm-zip'
import { randomBytes } from 'node:crypto'

import {
  validateHtmlPackageZip,
  PackageValidationError,
} from '@/modules/packages/infrastructure/zipValidation'

const VALID_MANIFEST = {
  kind: 'tool',
  entrypoint: 'index.html',
  version: 1,
  requiredCapabilities: ['canvas'],
  externalDomains: [],
  minViewport: { width: 320, height: 420 },
}

function buildZip(
  files: Record<string, string>,
  manifest: unknown = VALID_MANIFEST,
): Buffer {
  const zip = new AdmZip()

  if (manifest !== null) {
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest)))
  }

  for (const [path, content] of Object.entries(files)) {
    zip.addFile(path, Buffer.from(content))
  }

  return zip.toBuffer()
}

describe('validateHtmlPackageZip', () => {
  it('acepta un paquete mínimo válido: index.html + manifest.json', () => {
    const buffer = buildZip({ 'index.html': '<h1>Hola</h1>' })

    const result = validateHtmlPackageZip(buffer)

    expect(result.manifest.kind).toBe('tool')
    expect(result.entries.some((e) => e.path === 'index.html')).toBe(true)
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/)
  })

  it('rechaza un ZIP sin index.html en la raíz (§12.2)', () => {
    const buffer = buildZip({ 'other.html': '<h1>Hola</h1>' })

    expect(() => validateHtmlPackageZip(buffer)).toThrow(PackageValidationError)

    try {
      validateHtmlPackageZip(buffer)
    } catch (error) {
      expect((error as PackageValidationError).issues.join()).toContain(
        'index.html',
      )
    }
  })

  it('rechaza un ZIP sin manifest.json', () => {
    const buffer = buildZip({ 'index.html': '<h1>Hola</h1>' }, null)

    expect(() => validateHtmlPackageZip(buffer)).toThrow(/manifest\.json/)
  })

  it('rechaza manifest.json que no es JSON válido', () => {
    const zip = new AdmZip()
    zip.addFile('index.html', Buffer.from('<h1>Hola</h1>'))
    zip.addFile('manifest.json', Buffer.from('{ esto no es json'))

    expect(() => validateHtmlPackageZip(zip.toBuffer())).toThrow(
      /no es JSON válido/,
    )
  })

  it('rechaza un manifest que no cumple el schema (falta minViewport)', () => {
    const incomplete: Record<string, unknown> = { ...VALID_MANIFEST }
    delete incomplete.minViewport

    const buffer = buildZip({ 'index.html': '<h1>Hola</h1>' }, incomplete)

    expect(() => validateHtmlPackageZip(buffer)).toThrow(/manifest\.json:/)
  })

  it('rechaza si el entrypoint declarado no existe dentro del ZIP', () => {
    const buffer = buildZip(
      { 'index.html': '<h1>Hola</h1>' },
      { ...VALID_MANIFEST, entrypoint: 'no-existe.html' },
    )

    expect(() => validateHtmlPackageZip(buffer)).toThrow(/entrypoint/)
  })

  it('rechaza rutas con ".." (protección zip-slip, §12.5)', () => {
    const zip = new AdmZip()
    zip.addFile('index.html', Buffer.from('<h1>Hola</h1>'))
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(VALID_MANIFEST)))

    // adm-zip normaliza (sanea) las rutas al llamar a addFile() — un
    // ataque real de zip-slip no pasa por esa sanitización porque el ZIP
    // se fabrica con otra herramienta o a mano. Para probar la protección
    // de VALIDATEHtmlPackageZip (no la de adm-zip), se muta entryName
    // directamente sobre la entrada ya añadida, saltándose el saneado —
    // confirmado que esto sí sobrevive a un toBuffer()/relectura.
    zip.addFile('placeholder.txt', Buffer.from('x'))
    const entry = zip
      .getEntries()
      .find((e) => e.entryName === 'placeholder.txt')!
    entry.entryName = '../fuera.txt'

    expect(() => validateHtmlPackageZip(zip.toBuffer())).toThrow(/no permitida/)
  })

  it('rechaza un ZIP que supera el límite de tamaño configurado', () => {
    // Relleno aleatorio: incompresible, así el ZIP resultante sí pesa lo
    // que pesa el contenido (un relleno repetido como "a".repeat(...)
    // comprime a casi nada con DEFLATE y nunca llegaría al límite).
    const bigContent = randomBytes(21 * 1024 * 1024).toString('base64')
    const buffer = buildZip({ 'index.html': bigContent })

    expect(() => validateHtmlPackageZip(buffer)).toThrow(/supera el límite/)
  })

  it('rechaza si el JS del paquete registra un Service Worker (§12.2)', () => {
    const buffer = buildZip({
      'index.html': '<script src="main.js"></script>',
      'main.js': 'navigator.serviceWorker.register("/sw.js")',
    })

    expect(() => validateHtmlPackageZip(buffer)).toThrow(/Service Worker/)
  })

  it('rechaza una URL absoluta a un dominio que no está en externalDomains', () => {
    const buffer = buildZip({
      'index.html': '<script src="main.js"></script>',
      'main.js': 'fetch("https://evil.example.com/data")',
    })

    expect(() => validateHtmlPackageZip(buffer)).toThrow(/evil\.example\.com/)
  })

  it('acepta una URL absoluta cuyo dominio SÍ está en externalDomains del manifest', () => {
    const buffer = buildZip(
      {
        'index.html': '<script src="main.js"></script>',
        'main.js': 'fetch("https://api.trusted.com/data")',
      },
      { ...VALID_MANIFEST, externalDomains: ['api.trusted.com'] },
    )

    const result = validateHtmlPackageZip(buffer)

    expect(result.manifest.externalDomains).toEqual(['api.trusted.com'])
  })

  it('el checksum es determinista para el mismo contenido', () => {
    const bufferA = buildZip({ 'index.html': '<h1>Hola</h1>' })
    const bufferB = buildZip({ 'index.html': '<h1>Hola</h1>' })

    // No se compara buffer a buffer (adm-zip puede variar metadatos como
    // fechas entre invocaciones) — se compara el checksum calculado, que
    // es lo que realmente importa para versionado/deduplicación.
    const resultA = validateHtmlPackageZip(bufferA)
    const resultB = validateHtmlPackageZip(bufferB)

    expect(resultA.checksum).toBe(resultB.checksum)
  })
})
