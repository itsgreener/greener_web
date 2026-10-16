import { describe, expect, it } from 'vitest'
import * as cheerio from 'cheerio'

import { composeToolDocument } from '@/modules/packages/application/composeToolDocument'
import type {
  PackageMetadata,
  ResolvedPackage,
} from '@/modules/packages/domain/manifest'

/**
 * Fija las afirmaciones de `contrato-zip-tools-insights.md` §6.2 («Qué mete
 * Greener en el <head> con tus metadatos») contra la composición real.
 */

const SITE = 'https://itsgreener.com'

const METADATA: PackageMetadata = {
  title: 'Informe 2026 <b>',
  description: 'Lo que "ha pasado" & lo que viene.',
  language: 'es',
  ogImage: {
    path: 'assets/og.png',
    alt: 'Gráfico de barras',
    width: 1200,
    height: 630,
  },
  themeColor: '#1941f5',
  keywords: ['informe', 'datos'],
}

const PACKAGE_HTML = `<!doctype html>
<html lang="xx">
  <head>
    <meta charset="utf-8" />
    <title>Título del paquete</title>
    <meta name="description" content="descripción del paquete" />
    <meta name="keywords" content="del,paquete" />
    <meta name="theme-color" content="#000000" />
    <meta property="og:title" content="og del paquete" />
    <meta name="twitter:card" content="summary" />
    <link rel="canonical" href="https://otro.example/" />
    <script type="application/ld+json">{"@type":"Thing"}</script>
    <link rel="stylesheet" href="./assets/style.css" />
    <style>.x { color: red; }</style>
  </head>
  <body><p>Hola</p></body>
</html>`

function compose(
  kind: 'tool' | 'insight' | 'variety',
  metadata: PackageMetadata | null = METADATA,
  html = PACKAGE_HTML,
) {
  const pkg: ResolvedPackage = {
    slug: 'informe-2026',
    html,
    manifest: {
      kind,
      entrypoint: 'index.html',
      version: 1,
      requiredCapabilities: [],
      externalDomains: [],
      minViewport: { width: 320, height: 420 },
      metadata: metadata ?? undefined,
    },
  }

  const plural = { tool: 'tools', insight: 'insights', variety: 'variety' }[
    kind
  ]

  return composeToolDocument(
    pkg,
    { width: 900, height: 700, sidebarWidth: 64 },
    `/${plural}/informe-2026/app/`,
    SITE,
  )
}

function head(doc: string) {
  return cheerio.load(doc)
}

describe('contrato §6.2 — el head sale de metadata', () => {
  const $ = head(compose('insight'))
  const content = (selector: string) => $(selector).attr('content')

  it('<title> con el título del manifest y « · Greener», escapado', () => {
    expect($('title')).toHaveLength(1)
    expect($('title').text()).toBe('Informe 2026 <b> · Greener')
  })

  it('<html lang> es el idioma declarado', () => {
    expect($('html').attr('lang')).toBe('es')
  })

  it('description, keywords y theme-color son los del manifest', () => {
    expect(content('meta[name="description"]')).toBe(
      'Lo que "ha pasado" & lo que viene.',
    )
    expect(content('meta[name="keywords"]')).toBe('informe, datos')
    expect(content('meta[name="theme-color"]')).toBe('#1941f5')
  })

  it('canonical y og:url son la URL pública del documento, absoluta y sin barra final', () => {
    const url = `${SITE}/insights/informe-2026/app`

    expect($('link[rel="canonical"]').attr('href')).toBe(url)
    expect(content('meta[property="og:url"]')).toBe(url)
  })

  it('og:image y twitter:image son ABSOLUTAS y apuntan a la ruta de assets del propio paquete', () => {
    const image = `${SITE}/insights/informe-2026/app/assets/og.png`

    expect(content('meta[property="og:image"]')).toBe(image)
    expect(content('meta[name="twitter:image"]')).toBe(image)
    expect(content('meta[property="og:image:alt"]')).toBe('Gráfico de barras')
    expect(content('meta[name="twitter:image:alt"]')).toBe('Gráfico de barras')
  })

  it('og:image:width/height salen de las medidas reales medidas al subir', () => {
    expect(content('meta[property="og:image:width"]')).toBe('1200')
    expect(content('meta[property="og:image:height"]')).toBe('630')
  })

  it('Twitter Card grande y og:site_name «Greener»', () => {
    expect(content('meta[name="twitter:card"]')).toBe('summary_large_image')
    expect(content('meta[property="og:site_name"]')).toBe('Greener')
    expect(content('meta[property="og:title"]')).toBe('Informe 2026 <b>')
    expect(content('meta[name="twitter:title"]')).toBe('Informe 2026 <b>')
  })

  it('og:type es «article» en un insight y «website» en una tool', () => {
    expect(content('meta[property="og:type"]')).toBe('article')
    expect(
      head(compose('tool'))
        .root()
        .find('meta[property="og:type"]')
        .attr('content'),
    ).toBe('website')
  })

  it.each([
    ['es', 'es_ES'],
    ['en', 'en_US'],
    ['ca', 'ca_ES'],
    ['pt-BR', 'pt_BR'],
  ])('og:locale para el idioma "%s" es %s', (language, locale) => {
    const doc = head(compose('insight', { ...METADATA, language }))

    expect(doc('meta[property="og:locale"]').attr('content')).toBe(locale)
  })

  it('JSON-LD: Article en un insight y WebApplication en una tool', () => {
    const insight = JSON.parse($('script[type="application/ld+json"]').text())
    const tool = JSON.parse(
      head(compose('tool'))
        .root()
        .find('script[type="application/ld+json"]')
        .text(),
    )

    expect(insight['@type']).toBe('Article')
    expect(insight.headline).toBe('Informe 2026 <b>')
    expect(insight.image).toBe(
      `${SITE}/insights/informe-2026/app/assets/og.png`,
    )
    expect(insight.inLanguage).toBe('es')
    expect(tool['@type']).toBe('WebApplication')
  })

  it('una página satélite (variety) es «website» y su JSON-LD es WebPage, con su propia URL', () => {
    const $variety = head(compose('variety'))
    const ld = JSON.parse($variety('script[type="application/ld+json"]').text())

    expect($variety('meta[property="og:type"]').attr('content')).toBe('website')
    expect($variety('link[rel="canonical"]').attr('href')).toBe(
      `${SITE}/variety/informe-2026/app`,
    )
    expect(ld['@type']).toBe('WebPage')
    expect(ld.image).toBe(`${SITE}/variety/informe-2026/app/assets/og.png`)
  })

  it('el JSON-LD no puede cerrar su <script> aunque el título lleve «</script>»', () => {
    const doc = compose('insight', {
      ...METADATA,
      title: '</script><script>alert(1)</script>',
    })

    expect(doc).not.toContain('<script>alert(1)')
    expect(head(doc)('script[type="application/ld+json"]')).toHaveLength(1)
  })

  it('descarta las etiquetas equivalentes del <head> del paquete (sin duplicados), pero conserva el resto', () => {
    const doc = compose('insight')
    const parsed = head(doc)

    expect(parsed('title')).toHaveLength(1)
    expect(parsed('meta[name="description"]')).toHaveLength(1)
    expect(parsed('meta[name="keywords"]')).toHaveLength(1)
    expect(parsed('meta[name="theme-color"]')).toHaveLength(1)
    expect(parsed('meta[property="og:title"]')).toHaveLength(1)
    expect(parsed('meta[name="twitter:card"]')).toHaveLength(1)
    expect(parsed('link[rel="canonical"]')).toHaveLength(1)
    expect(parsed('script[type="application/ld+json"]')).toHaveLength(1)
    for (const own of [
      'Título del paquete',
      'descripción del paquete',
      'og del paquete',
    ]) {
      expect(doc).not.toContain(own)
    }
    expect(doc).not.toContain('otro.example')

    expect(doc).toContain('href="./assets/style.css"')
    expect(doc).toContain('.x { color: red; }')
    expect(doc).toContain('<p>Hola</p>')
  })

  it('sin themeColor ni keywords no emite esas etiquetas', () => {
    const doc = head(
      compose('insight', {
        ...METADATA,
        themeColor: undefined,
        keywords: undefined,
      }),
    )

    expect(doc('meta[name="theme-color"]')).toHaveLength(0)
    expect(doc('meta[name="keywords"]')).toHaveLength(0)
  })
})

describe('versiones anteriores al bloque metadata', () => {
  it('se sirven como antes: título «slug · Greener», html lang="en", sin etiquetas OG, y conservan las del paquete', () => {
    const doc = compose('insight', null)
    const parsed = head(doc)

    expect(parsed('html').attr('lang')).toBe('en')
    expect(parsed('title').first().text()).toBe('informe-2026 · Greener')
    expect(parsed('meta[property="og:image"]')).toHaveLength(0)
    expect(doc).toContain('og del paquete')
    expect(doc).toContain('https://otro.example/')
  })
})
