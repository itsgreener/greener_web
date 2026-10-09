import { describe, it, expect } from 'vitest'

import { composeToolDocument } from '@/modules/packages/application/composeToolDocument'
import type { ResolvedPackage } from '@/modules/packages/domain/manifest'

/**
 * Fija las afirmaciones de `contrato-zip-tools-insights.md` §6 («Cómo se
 * monta tu HTML en la página») contra la composición real.
 */

const PACKAGE_HTML = `<!doctype html>
<html lang="ca" data-tema="oscuro">
  <head>
    <meta charset="utf-8" />
    <title>Título del paquete</title>
    <link rel="stylesheet" href="./assets/style.css" />
    <style>.mi-tool { color: red; }</style>
  </head>
  <body class="oscuro" style="margin: 0">
    <div class="mi-tool">Hola</div>
    <script src="./assets/main.js"></script>
  </body>
</html>`

function compose(): string {
  const pkg = {
    slug: 'mi-tool',
    html: PACKAGE_HTML,
    manifest: {
      kind: 'tool',
      entrypoint: 'index.html',
      version: 1,
      requiredCapabilities: [],
      externalDomains: [],
      minViewport: { width: 320, height: 420 },
    },
  } as ResolvedPackage

  return composeToolDocument(
    pkg,
    { width: 'calc(100dvw - 64px)', height: '100dvh', sidebarWidth: 64 },
    '/tools/mi-tool/app/',
  )
}

describe('contrato §6 — cómo se monta el HTML del paquete', () => {
  it('conserva el contenido del <head> (link y style)', () => {
    const doc = compose()

    expect(doc).toContain('href="./assets/style.css"')
    expect(doc).toContain('.mi-tool { color: red; }')
  })

  it('del <body> solo copia lo de dentro: se pierden sus atributos y los de <html> (el <html lang> del documento compuesto es el del sitio, no el del paquete)', () => {
    const doc = compose()

    expect(doc).toContain('<div class="mi-tool">Hola</div>')
    expect(doc).not.toContain('class="oscuro"')
    expect(doc).not.toContain('style="margin: 0"')
    expect(doc).not.toContain('data-tema')
    expect(doc).not.toContain('lang="ca"')
    expect(doc).toContain('<html lang="en">')
  })

  it('el <title> del documento es el propio del sitio y va antes que el del paquete', () => {
    const doc = compose()

    expect(doc.indexOf('mi-tool · Greener')).toBeGreaterThan(-1)
    expect(doc.indexOf('mi-tool · Greener')).toBeLessThan(
      doc.indexOf('Título del paquete'),
    )
  })

  it('fija <base href> a la ruta /app/ del contenido, antes del CSS/JS del paquete', () => {
    const doc = compose()

    expect(doc).toContain('<base href="/tools/mi-tool/app/" />')
    expect(doc.indexOf('<base href')).toBeLessThan(
      doc.indexOf('./assets/style.css'),
    )
  })

  it('un `new Worker(./worker.js)` en JS se resuelve contra la base, no contra assets/', () => {
    const base = 'http://localhost/tools/mi-tool/app/'

    expect(new URL('./worker.js', base).pathname).toBe(
      '/tools/mi-tool/app/worker.js',
    )
    expect(new URL('./assets/worker.js', base).pathname).toBe(
      '/tools/mi-tool/app/assets/worker.js',
    )
  })
})
