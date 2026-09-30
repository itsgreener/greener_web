import { describe, it, expect } from 'vitest'
import AdmZip from 'adm-zip'

import {
  validateHtmlPackageZip,
  PackageValidationError,
} from '@/modules/packages/infrastructure/zipValidation'

/**
 * Cada test fija una afirmación concreta de `contrato-zip-tools-insights.md`
 * (§1 y §3) contra el validador REAL. Si el validador cambia, estos tests
 * fallan y obligan a actualizar el contrato — que es lo que se enviará a
 * quien prepare los paquetes, y no puede prometer algo que el código no hace.
 */

function manifest(externalDomains: string[] = []) {
  return {
    kind: 'insight',
    entrypoint: 'index.html',
    version: 1,
    requiredCapabilities: [],
    externalDomains,
    minViewport: { width: 320, height: 420 },
  }
}

function buildZip(
  files: Record<string, string>,
  externalDomains: string[] = [],
): Buffer {
  const zip = new AdmZip()
  zip.addFile(
    'manifest.json',
    Buffer.from(JSON.stringify(manifest(externalDomains))),
  )
  for (const [path, content] of Object.entries(files)) {
    zip.addFile(path, Buffer.from(content))
  }
  return zip.toBuffer()
}

function issuesOf(buffer: Buffer): string[] {
  try {
    validateHtmlPackageZip(buffer)
    return []
  } catch (error) {
    if (error instanceof PackageValidationError) {
      return error.issues
    }
    throw error
  }
}

describe('contrato §3 — el escaneo de dominios cuenta todo, sin distinguir tipo de uso', () => {
  it('un <a href> a una fuente citada cuenta igual que un recurso', () => {
    const issues = issuesOf(
      buildZip({
        'index.html': '<a href="https://fuente.example/informe">Fuente</a>',
      }),
    )
    expect(issues.join(' ')).toContain('fuente.example')
  })

  it('una URL escrita como texto visible de una cita también cuenta', () => {
    const issues = issuesOf(
      buildZip({ 'index.html': '<p>Fuente: https://cita.example/pag</p>' }),
    )
    expect(issues.join(' ')).toContain('cita.example')
  })

  it('una URL dentro de un comentario también cuenta', () => {
    const issues = issuesOf(
      buildZip({
        'index.html': '<!-- https://comentario.example -->',
        'assets/main.js': '/*! lib https://threejs.org MIT */',
      }),
    )
    expect(issues.join(' ')).toContain('comentario.example')
    expect(issues.join(' ')).toContain('threejs.org')
  })

  it('el namespace de un SVG inline NO cuenta como dominio externo (falso positivo corregido el 29 sep)', () => {
    const html = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'

    expect(issuesOf(buildZip({ 'index.html': html }))).toEqual([])
  })

  it('los namespaces XLink y XHTML tampoco cuentan', () => {
    const html =
      '<html xmlns="http://www.w3.org/1999/xhtml">' +
      '<svg><use xlink:href="#x" xmlns:xlink="http://www.w3.org/1999/xlink" /></svg>' +
      '</html>'

    expect(issuesOf(buildZip({ 'index.html': html }))).toEqual([])
  })

  it('una URL real de w3.org que NO sea exactamente un namespace conocido sigue contando', () => {
    const issues = issuesOf(
      buildZip({
        'index.html':
          '<a href="http://www.w3.org/2000/svgx/algo-distinto">x</a>',
      }),
    )
    expect(issues.join(' ')).toContain('www.w3.org')
  })

  it('declarar el dominio basta: cien enlaces al mismo dominio son una entrada', () => {
    const links = Array.from(
      { length: 100 },
      (_, i) => `<a href="https://fuente.example/p${i}">${i}</a>`,
    ).join('')

    expect(
      issuesOf(buildZip({ 'index.html': links }, ['fuente.example'])),
    ).toEqual([])
  })

  it('sin declarar, cien enlaces al mismo dominio dan UN solo aviso, no cien (evita ahogar el resto de la lista)', () => {
    const links = Array.from(
      { length: 100 },
      (_, i) => `<a href="https://fuente.example/p${i}">${i}</a>`,
    ).join('')

    const issues = issuesOf(buildZip({ 'index.html': links }))

    expect(issues).toHaveLength(1)
    expect(issues[0]).toContain('fuente.example')
  })

  it('la comparación es por dominio exacto: www.x.com y x.com son distintos', () => {
    const issues = issuesOf(
      buildZip({ 'index.html': '<a href="https://www.x.com/a">x</a>' }, [
        'x.com',
      ]),
    )
    expect(issues.join(' ')).toContain('www.x.com')
  })

  it('sin comodines: *.x.com no cubre a.x.com', () => {
    const issues = issuesOf(
      buildZip({ 'index.html': '<a href="https://a.x.com/">x</a>' }, [
        '*.x.com',
      ]),
    )
    expect(issues.join(' ')).toContain('a.x.com')
  })

  it('también se escanea el propio manifest.json', () => {
    const zip = new AdmZip()
    zip.addFile('index.html', Buffer.from('<p>hola</p>'))
    zip.addFile(
      'manifest.json',
      Buffer.from(
        JSON.stringify({
          ...manifest(),
          homepage: 'https://en-manifest.example',
        }),
      ),
    )
    expect(issuesOf(zip.toBuffer()).join(' ')).toContain('en-manifest.example')
  })

  it('un enlace relativo no es un dominio y no cuenta', () => {
    expect(
      issuesOf(
        buildZip({
          'index.html':
            '<a href="./assets/llms.txt">llms</a><a href="#s">s</a>',
          'assets/llms.txt': 'hola',
        }),
      ),
    ).toEqual([])
  })
})

describe('contrato §1 — todo lo que no sea index.html/manifest.json debe vivir bajo assets/', () => {
  it('un CSS en la raíz rechaza la subida con un mensaje claro (corregido el 29 sep: antes pasaba y daba 404)', () => {
    const issues = issuesOf(
      buildZip({ 'index.html': '<p>hola</p>', 'style.css': 'p{}' }),
    )
    expect(issues.join(' ')).toContain('style.css')
    expect(issues.join(' ')).toContain('assets/')
  })

  it('el mismo CSS pasa si está bajo assets/', () => {
    expect(
      issuesOf(
        buildZip({
          'index.html': '<p>hola</p>',
          'assets/style.css': 'p{}',
        }),
      ),
    ).toEqual([])
  })

  it('subcarpetas dentro de assets/ están permitidas', () => {
    expect(
      issuesOf(
        buildZip({
          'index.html': '<p>hola</p>',
          'assets/img/logo.png': 'x',
          'assets/js/worker.js': 'x',
        }),
      ),
    ).toEqual([])
  })
})
