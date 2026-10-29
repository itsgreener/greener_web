import { randomBytes } from 'node:crypto'
import { describe, it, expect } from 'vitest'
import AdmZip from 'adm-zip'

import { PackageValidationError } from '@/modules/packages/domain/packageErrors'
import {
  isOsJunkPath,
  validateHtmlPackageZip,
} from '@/modules/packages/infrastructure/zipValidation'
import { PACKAGE_LIMITS } from '@/modules/packages/domain/packageLimits'
import {
  OG_IMAGE_PATH,
  VALID_METADATA,
  pngBytes,
} from '@tests/helpers/packageFixtures'

const VALID_MANIFEST = {
  kind: 'tool',
  entrypoint: 'index.html',
  version: 1,
  requiredCapabilities: ['canvas'],
  externalDomains: [],
  minViewport: { width: 320, height: 420 },
  metadata: VALID_METADATA,
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

  if (!(OG_IMAGE_PATH in files)) {
    zip.addFile(OG_IMAGE_PATH, pngBytes())
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
      'index.html': '<script src="assets/main.js"></script>',
      'assets/main.js': 'navigator.serviceWorker.register("/sw.js")',
    })

    expect(() => validateHtmlPackageZip(buffer)).toThrow(/Service Worker/)
  })

  it('rechaza una URL absoluta a un dominio que no está en externalDomains', () => {
    const buffer = buildZip({
      'index.html': '<script src="assets/main.js"></script>',
      'assets/main.js': 'fetch("https://evil.example.com/data")',
    })

    expect(() => validateHtmlPackageZip(buffer)).toThrow(/evil\.example\.com/)
  })

  it('acepta una URL absoluta cuyo dominio SÍ está en externalDomains del manifest', () => {
    const buffer = buildZip(
      {
        'index.html': '<script src="assets/main.js"></script>',
        'assets/main.js': 'fetch("https://api.trusted.com/data")',
      },
      { ...VALID_MANIFEST, externalDomains: ['api.trusted.com'] },
    )

    const result = validateHtmlPackageZip(buffer)

    expect(result.manifest.externalDomains).toEqual(['api.trusted.com'])
  })

  it('rechaza un archivo fuera de assets/ que no sea index.html ni manifest.json (§1)', () => {
    const buffer = buildZip({
      'index.html': '<script src="style.css"></script>',
      'style.css': 'p { color: red; }',
    })

    expect(() => validateHtmlPackageZip(buffer)).toThrow(
      /"style\.css".*fuera de la carpeta assets\//,
    )
  })

  it('acepta el mismo archivo si está correctamente bajo assets/', () => {
    const buffer = buildZip({
      'index.html': '<link rel="stylesheet" href="assets/style.css">',
      'assets/style.css': 'p { color: red; }',
    })

    expect(() => validateHtmlPackageZip(buffer)).not.toThrow()
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

describe('ZIP mal preparado: mensajes claros', () => {
  function issuesOf(buffer: Buffer): string[] {
    try {
      validateHtmlPackageZip(buffer)
    } catch (error) {
      if (error instanceof PackageValidationError) return error.issues
      throw error
    }

    throw new Error('Se esperaba un rechazo de validación.')
  }

  /** ZIP con la misma ruta dos veces: adm-zip no puede crearlo, se escribe a mano. */
  function zipWithDuplicate(): Buffer {
    const zip = new AdmZip()
    zip.addFile('index.html', Buffer.from('<html></html>'))
    zip.addFile('assets/a.js', Buffer.from('1'))
    zip.addFile('assets/b.js', Buffer.from('2'))

    // Renombra la segunda entrada para que coincida con la primera, tanto en
    // el directorio local como en el central (mismo largo: «a.js» / «b.js»).
    return Buffer.from(
      zip.toBuffer().toString('latin1').replaceAll('b.js', 'a.js'),
      'latin1',
    )
  }

  it('una ruta repetida se rechaza con un mensaje claro, no con el error genérico', () => {
    expect(issuesOf(zipWithDuplicate())).toEqual([
      'El ZIP contiene dos ficheros con la misma ruta: "assets/a.js".',
    ])
  })

  it('mayúsculas distintas no cuentan como ruta repetida', () => {
    const zip = new AdmZip()
    zip.addFile('assets/a.js', Buffer.from('1'))
    zip.addFile('assets/A.JS', Buffer.from('2'))

    expect(issuesOf(zip.toBuffer())[0]).toMatch(/Falta index.html/)
  })

  it('un fichero que no es un ZIP sigue dando el mensaje de siempre', () => {
    expect(issuesOf(Buffer.from('esto no es un zip'))).toEqual([
      'El archivo no es un ZIP válido.',
    ])
  })

  it('con la carpeta comprimida en vez de su contenido, dice cuál es el problema', () => {
    const zip = new AdmZip()
    zip.addFile('rings/index.html', Buffer.from('<html></html>'))
    zip.addFile('rings/manifest.json', Buffer.from('{}'))
    zip.addFile('rings/assets/a.js', Buffer.from('1'))
    zip.addFile('__MACOSX/rings/._index.html', Buffer.from('x'))
    zip.addFile('.DS_Store', Buffer.from('x'))

    const [message] = issuesOf(zip.toBuffer())

    expect(message).toContain('Falta index.html en la raíz del ZIP (§12.2)')
    expect(message).toContain('«rings»')
    expect(message).toContain('no la carpeta que los contiene')
  })

  it('sin index.html ni carpeta envolvente, el mensaje es el de siempre', () => {
    const zip = new AdmZip()
    zip.addFile('manifest.json', Buffer.from('{}'))
    zip.addFile('assets/a.js', Buffer.from('1'))

    expect(issuesOf(zip.toBuffer())).toEqual([
      'Falta index.html en la raíz del ZIP (§12.2).',
    ])
  })

  it('dos carpetas en la raíz no se toman por una envolvente', () => {
    const zip = new AdmZip()
    zip.addFile('uno/index.html', Buffer.from('<html></html>'))
    zip.addFile('dos/index.html', Buffer.from('<html></html>'))

    expect(issuesOf(zip.toBuffer())).toEqual([
      'Falta index.html en la raíz del ZIP (§12.2).',
    ])
  })
})

describe('restos del sistema operativo en el ZIP', () => {
  const MAC_JUNK = {
    '__MACOSX/._index.html': 'x',
    '__MACOSX/assets/._app.js': 'x',
    '.DS_Store': 'x',
    'assets/.DS_Store': 'x',
  }

  it('un ZIP hecho con el Finder se acepta igual que uno limpio', () => {
    const clean = validateHtmlPackageZip(
      buildZip({ 'index.html': '<h1>Hola</h1>', 'assets/app.js': '1' }),
    )
    const withJunk = validateHtmlPackageZip(
      buildZip({
        'index.html': '<h1>Hola</h1>',
        'assets/app.js': '1',
        ...MAC_JUNK,
      }),
    )

    expect(withJunk.entries.map((e) => e.path).sort()).toEqual(
      clean.entries.map((e) => e.path).sort(),
    )
    expect(withJunk.checksum).toBe(clean.checksum)
  })

  it('no se publica ninguno de esos ficheros', () => {
    const result = validateHtmlPackageZip(
      buildZip({ 'index.html': '<h1>Hola</h1>', ...MAC_JUNK }),
    )
    const paths = result.entries.map((e) => e.path)

    expect(paths.some((p) => p.includes('__MACOSX'))).toBe(false)
    expect(paths.some((p) => p.endsWith('.DS_Store'))).toBe(false)
  })

  it('la copia ._index.html de __MACOSX no cuenta como documento HTML adicional', () => {
    expect(() =>
      validateHtmlPackageZip(
        buildZip({ 'index.html': '<h1>Hola</h1>', ...MAC_JUNK }),
      ),
    ).not.toThrow()
  })

  it('no cuentan para el tope de ficheros del ZIP', () => {
    const junk: Record<string, string> = {}

    for (let i = 0; i < PACKAGE_LIMITS.maxEntries + 5; i++) {
      junk[`__MACOSX/assets/._f${i}.js`] = 'x'
    }

    expect(() =>
      validateHtmlPackageZip(
        buildZip({ 'index.html': '<h1>Hola</h1>', ...junk }),
      ),
    ).not.toThrow()
  })

  it('un fichero de verdad fuera de assets/ se sigue rechazando', () => {
    const zip = new AdmZip()
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(VALID_MANIFEST)))
    zip.addFile('index.html', Buffer.from('<h1>Hola</h1>'))
    zip.addFile('suelto.js', Buffer.from('1'))
    zip.addFile('.DS_Store', Buffer.from('x'))

    expect(() => validateHtmlPackageZip(zip.toBuffer())).toThrow(
      /"suelto.js" está fuera de la carpeta assets/,
    )
  })

  it('isOsJunkPath: solo esos nombres, en cualquier nivel', () => {
    expect(isOsJunkPath('__MACOSX/a/._b.js')).toBe(true)
    expect(isOsJunkPath('.DS_Store')).toBe(true)
    expect(isOsJunkPath('assets/img/.DS_Store')).toBe(true)
    expect(isOsJunkPath('assets\\.DS_Store')).toBe(true)
    expect(isOsJunkPath('assets/DS_Store.png')).toBe(false)
    expect(isOsJunkPath('assets/my.DS_Store.js')).toBe(false)
    expect(isOsJunkPath('index.html')).toBe(false)
  })
})
