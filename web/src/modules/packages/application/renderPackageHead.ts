import type {
  PackageManifest,
  PackageMetadata,
} from '@/modules/packages/domain/manifest'

/**
 * Etiquetas del `<head>` que Greener genera a partir del bloque `metadata`
 * del manifest (contrato del ZIP §2.1 y §6.2): título, descripción, canonical,
 * Open Graph, Twitter Card, color de tema, keywords y JSON-LD.
 *
 * El autor del paquete NO escribe nada de esto en su HTML: lo declara una vez
 * en `manifest.json` y el servidor lo emite, con URLs absolutas (los scrapers
 * de redes sociales no resuelven rutas relativas ni ejecutan JavaScript).
 */

const SITE_NAME = 'Greener'

/** Idiomas sin región → `og:locale` (que exige `xx_YY`). */
const DEFAULT_REGION: Record<string, string> = {
  es: 'es_ES',
  en: 'en_US',
  ca: 'ca_ES',
  fr: 'fr_FR',
  de: 'de_DE',
  it: 'it_IT',
  pt: 'pt_PT',
}

/** Selectores del `<head>` propio del paquete que Greener sustituye. */
export const PACKAGE_HEAD_OVERRIDDEN_SELECTORS = [
  'title',
  'meta[name="description"]',
  'meta[name="keywords"]',
  'meta[name="theme-color"]',
  'meta[property^="og:"]',
  'meta[name^="twitter:"]',
  'link[rel="canonical"]',
  'script[type="application/ld+json"]',
].join(', ')

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function ogLocale(language: string): string | null {
  if (language.includes('-')) return language.replace('-', '_')

  return DEFAULT_REGION[language] ?? null
}

export function pageTitle(metadata: PackageMetadata | undefined, slug: string) {
  return metadata
    ? `${metadata.title} · ${SITE_NAME}`
    : `${slug} · ${SITE_NAME}`
}

function meta(attribute: 'name' | 'property', key: string, value: string) {
  return `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`
}

function jsonLd(
  manifest: PackageManifest,
  metadata: PackageMetadata,
  pageUrl: string,
  imageUrl: string,
): string {
  const base = {
    '@context': 'https://schema.org',
    name: metadata.title,
    description: metadata.description,
    image: imageUrl,
    url: pageUrl,
    inLanguage: metadata.language,
    publisher: { '@type': 'Organization', name: SITE_NAME },
  }

  const data =
    manifest.kind === 'insight'
      ? { ...base, '@type': 'Article', headline: metadata.title }
      : {
          ...base,
          '@type': 'WebApplication',
          applicationCategory: 'WebApplication',
        }

  // «<» escapado: un título con «</script>» no puede cerrar la etiqueta.
  const serialized = JSON.stringify(data).replace(/</g, '\\u003c')

  return `<script type="application/ld+json">${serialized}</script>`
}

/**
 * `pageUrl`: URL canónica absoluta del documento (sin barra final).
 * `assetsBaseUrl`: URL absoluta de la carpeta del paquete (con barra final),
 * sobre la que cuelga `ogImage.path`.
 */
export function renderMetadataHead(
  manifest: PackageManifest,
  metadata: PackageMetadata,
  pageUrl: string,
  assetsBaseUrl: string,
): string {
  const imageUrl = `${assetsBaseUrl}${metadata.ogImage.path}`
  const locale = ogLocale(metadata.language)

  const tags = [
    `<meta name="description" content="${escapeHtml(metadata.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(pageUrl)}" />`,

    meta(
      'property',
      'og:type',
      manifest.kind === 'insight' ? 'article' : 'website',
    ),
    meta('property', 'og:site_name', SITE_NAME),
    meta('property', 'og:title', metadata.title),
    meta('property', 'og:description', metadata.description),
    meta('property', 'og:url', pageUrl),
    meta('property', 'og:image', imageUrl),
    meta('property', 'og:image:alt', metadata.ogImage.alt),
  ]

  if (metadata.ogImage.width && metadata.ogImage.height) {
    tags.push(
      meta('property', 'og:image:width', String(metadata.ogImage.width)),
      meta('property', 'og:image:height', String(metadata.ogImage.height)),
    )
  }

  if (locale) tags.push(meta('property', 'og:locale', locale))

  tags.push(
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', metadata.title),
    meta('name', 'twitter:description', metadata.description),
    meta('name', 'twitter:image', imageUrl),
    meta('name', 'twitter:image:alt', metadata.ogImage.alt),
  )

  if (metadata.themeColor) {
    tags.push(meta('name', 'theme-color', metadata.themeColor))
  }

  if (metadata.keywords?.length) {
    tags.push(meta('name', 'keywords', metadata.keywords.join(', ')))
  }

  tags.push(jsonLd(manifest, metadata, pageUrl, imageUrl))

  return tags.join('\n    ')
}
