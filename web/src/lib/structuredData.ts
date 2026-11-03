import { workLocalePath } from '@/modules/content/domain/contentPath'
import { episodeProgramLabel } from '@/modules/content/domain/episodeLabels'
import type {
  PublicContent,
  PublicEpisode,
} from '@/modules/content/domain/publicContent'
import { SITE_NAME } from '@/lib/pageMetadata'

/**
 * Datos estructurados (JSON-LD, schema.org) de las páginas públicas. Puro:
 * recibe la URL del sitio y los modelos de lectura, devuelve objetos. Quien
 * los pinta es `<JsonLd>`.
 *
 * Qué se publica y qué no (decisión de Greener, 2 nov 2026):
 * - Home: Organization + WebSite.
 * - Caso: CreativeWork. Episodio: PodcastEpisode.
 * - Sin VideoObject para YouTube: el vídeo vive en el reproductor de
 *   YouTube, que ya publica el suyo.
 * - Las fichas de borrador (`?preview=`) no llevan nada.
 */

const CONTEXT = 'https://schema.org'

/**
 * Perfiles oficiales de Greener. Son los mismos del menú lateral
 * (`navItems`), pero con la URL de la página de empresa de LinkedIn en vez de
 * la de sus publicaciones; un test compara los dominios.
 */
export const ORGANIZATION_SAME_AS = [
  'https://www.instagram.com/itsgreenerhere/',
  'https://www.youtube.com/@Itsgreenernow',
  'https://www.linkedin.com/company/greener/',
] as const

/** Logo cuadrado en PNG: Google no admite SVG para el logo de organización. */
const LOGO_PATH = '/apple-touch-icon.png'

function base(siteUrl: string): string {
  return siteUrl.replace(/\/+$/, '')
}

export function organizationId(siteUrl: string): string {
  return `${base(siteUrl)}/#organization`
}

export function homeJsonLd(
  siteUrl: string,
  description: string,
): Record<string, unknown> {
  const root = base(siteUrl)

  return {
    '@context': CONTEXT,
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId(siteUrl),
        name: SITE_NAME,
        url: `${root}/`,
        description,
        logo: {
          '@type': 'ImageObject',
          url: `${root}${LOGO_PATH}`,
          width: 180,
          height: 180,
        },
        sameAs: [...ORGANIZATION_SAME_AS],
      },
      {
        '@type': 'WebSite',
        '@id': `${root}/#website`,
        name: SITE_NAME,
        url: `${root}/`,
        inLanguage: 'en',
        publisher: { '@id': organizationId(siteUrl) },
      },
    ],
  }
}

/** Editor/creador en línea: en una página suelta no hay `@graph` al que enlazar. */
function publisher(siteUrl: string) {
  return { '@type': 'Organization', name: SITE_NAME, url: `${base(siteUrl)}/` }
}

/**
 * Duración ISO 8601 (`PT1H2M5S`). Sin valor útil (nulo, cero, negativo o no
 * finito) devuelve undefined y la propiedad no se emite.
 */
export function isoDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    return undefined
  }

  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = total % 60

  const text =
    (hours ? `${hours}H` : '') +
    (minutes ? `${minutes}M` : '') +
    (rest ? `${rest}S` : '')

  return text ? `PT${text}` : undefined
}

function workUrl(siteUrl: string, content: PublicContent): string {
  return `${base(siteUrl)}${workLocalePath(
    content.slug,
    content.locale,
    content.defaultLocale,
  )}`
}

/** Ficha de caso en un idioma (la canónica o una variante). */
export function caseJsonLd(input: {
  siteUrl: string
  content: PublicContent
  /** URL absoluta de la primera imagen del carrusel, si la hay. */
  imageUrl?: string
}): Record<string, unknown> {
  const { siteUrl, content } = input

  return {
    '@context': CONTEXT,
    '@type': 'CreativeWork',
    name: content.title,
    description: content.seoDescription ?? content.highlight ?? undefined,
    url: workUrl(siteUrl, content),
    inLanguage: content.locale,
    datePublished: content.publishedAt,
    dateModified: content.updatedAt,
    image: input.imageUrl,
    creator: publisher(siteUrl),
    publisher: publisher(siteUrl),
  }
}

/** Ficha de episodio. Un episodio no se traduce: su idioma es el suyo. */
export function episodeJsonLd(input: {
  siteUrl: string
  content: PublicContent
  episode: PublicEpisode
  /** URL absoluta de la portada del episodio, si tiene. */
  imageUrl?: string
}): Record<string, unknown> {
  const { siteUrl, content, episode } = input
  const program = episodeProgramLabel(episode.program)

  return {
    '@context': CONTEXT,
    '@type': 'PodcastEpisode',
    name: content.title,
    description: content.seoDescription ?? content.highlight ?? undefined,
    url: workUrl(siteUrl, content),
    inLanguage: episode.language,
    datePublished: episode.episodeDate ?? content.publishedAt,
    dateModified: content.updatedAt,
    episodeNumber: episode.number ?? undefined,
    duration: isoDuration(episode.durationSeconds),
    partOfSeries: program
      ? { '@type': 'PodcastSeries', name: program }
      : undefined,
    image: input.imageUrl,
    publisher: publisher(siteUrl),
  }
}
