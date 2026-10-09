import { describe, it, expect } from 'vitest'

import { composeToolDocument } from '@/modules/packages/application/composeToolDocument'

import type { ResolvedPackage } from '@/modules/packages/domain/manifest'

const SAMPLE_PACKAGE: ResolvedPackage = {
  slug: 'pixel-palette',

  manifest: {
    kind: 'tool',

    entrypoint: 'index.html',

    version: 1,

    requiredCapabilities: ['canvas', 'worker', 'download'],

    externalDomains: [],

    minViewport: {
      width: 320,
      height: 420,
    },
  },

  html: `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Pixel Palette</title>
    <link rel="stylesheet" href="./assets/style.css" />
  </head>
  <body>
    <canvas id="canvas"></canvas>
    <script src="./assets/main.js"></script>
  </body>
</html>`,
}

const VIEWPORT = {
  width: 900,
  height: 700,
  sidebarWidth: 64,
}

describe('composeToolDocument', () => {
  const doc = composeToolDocument(
    SAMPLE_PACKAGE,
    VIEWPORT,
    '/tools/pixel-palette/',
  )

  it('produce un único documento HTML, sin <html> anidado', () => {
    const htmlTagCount = (doc.match(/<html/g) || []).length

    expect(htmlTagCount).toBe(1)

    const bodyTagCount = (doc.match(/<body/g) || []).length

    expect(bodyTagCount).toBe(1)
  })

  it('inyecta <base href> apuntando a la ruta propia del paquete', () => {
    expect(doc).toContain('<base href="/tools/pixel-palette/" />')
  })

  it('inyecta las variables CSS de viewport (§12.3)', () => {
    expect(doc).toContain('--greener-available-width: 900px')

    expect(doc).toContain('--greener-available-height: 700px')

    expect(doc).toContain('--greener-sidebar-width: 64px')
  })

  it('acepta expresiones CSS dinámicas para el viewport', () => {
    const dynamicDoc = composeToolDocument(
      SAMPLE_PACKAGE,
      {
        width: 'calc(100dvw - 64px)',
        height: '100dvh',
        sidebarWidth: 64,
      },
      '/tools/pixel-palette/app/',
    )

    expect(dynamicDoc).toContain(
      '--greener-available-width: calc(100dvw - 64px)',
    )

    expect(dynamicDoc).toContain('--greener-available-height: 100dvh')

    expect(dynamicDoc).toContain('--greener-sidebar-width: 64px')

    expect(dynamicDoc).not.toContain('--greener-available-width: 1136px')

    expect(dynamicDoc).not.toContain('--greener-available-height: 800px')
  })

  it('conserva el <link> y el <script> del paquete, con rutas relativas intactas', () => {
    expect(doc).toContain('href="./assets/style.css"')

    expect(doc).toContain('src="./assets/main.js"')
  })

  it('incluye el menú lateral real del sitio (useShell.ts): cuatro secciones y cinco enlaces sociales, sin entrada de Casos', () => {
    for (const label of ['We did it', 'Podcasts', 'Insights', 'Tools']) {
      expect(doc).toContain(`aria-label="${label}"`)
    }

    for (const label of [
      'Contact',
      'Instagram',
      'YouTube',
      'LinkedIn',
      'Privacy & Cookies',
    ]) {
      expect(doc).toContain(`aria-label="${label}"`)
    }

    expect(doc).not.toContain('aria-label="Casos"')
    // El menú real está en inglés (arquitectura §2.4) — no "Contacto".
    expect(doc).not.toContain('Contacto')
  })

  it('el logo enlaza a la home y los iconos usan los mismos ficheros que el Shell real', () => {
    expect(doc).toContain('href="/" aria-label="Greener"')
    expect(doc).toContain('src="/icons/logo_greener.svg"')
    expect(doc).toContain('url(/icons/works.svg)')
    expect(doc).toContain('url(/icons/tools.svg)')
  })

  it('los enlaces externos (redes sociales) abren en pestaña nueva y sin filtración de referrer', () => {
    expect(doc).toContain(
      'href="https://www.instagram.com/itsgreenerhere/" aria-label="Instagram" target="_blank" rel="noopener noreferrer"',
    )
  })

  it('los enlaces internos no llevan target="_blank" (sí navegan dentro del propio sitio)', () => {
    const match = doc.match(/<a[^>]*aria-label="Contact"[^>]*>/)

    expect(match).not.toBeNull()
    expect(match?.[0]).not.toContain('target="_blank"')
  })

  it('conserva el contenido del body del paquete (el canvas)', () => {
    expect(doc).toContain('<canvas id="canvas">')
  })

  // Runtime de "Tool Used" client-side (29 sep, integrado desde otra rama
  // de trabajo — ver el comentario de renderPackageAnalyticsRuntime en el
  // propio módulo para la decisión pendiente sobre si convive con el
  // evento que dispara el servidor en route.ts bajo el mismo nombre).
  it('las tools cargan el runtime de analítica del paquete, con su slug', () => {
    expect(doc).toContain(
      '<script src="/greener-package-analytics.js" data-greener-tool-slug="pixel-palette"></script>',
    )
  })

  it('los insights NO cargan ese runtime ("Tool Used" no existe para insights)', () => {
    const insightPackage: ResolvedPackage = {
      ...SAMPLE_PACKAGE,
      manifest: { ...SAMPLE_PACKAGE.manifest, kind: 'insight' },
    }

    const insightDoc = composeToolDocument(
      insightPackage,
      VIEWPORT,
      '/insights/pixel-palette/',
    )

    expect(insightDoc).not.toContain('greener-package-analytics.js')
  })
})
