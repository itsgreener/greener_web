import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { resolvePreviewContext } from '@/modules/content/application/resolvePreviewContext'
import { getPublicCaseDetail } from '@/modules/content/application/getPublicCaseDetail'
import { getPublicCaseCarousel } from '@/modules/content/application/getPublicCaseCarousel'
import { getPublicEpisode } from '@/modules/content/application/getPublicEpisode'
import { CaseDetail } from './CaseDetail'
import { EpisodeDetail } from './EpisodeDetail'
import { buildWorkMetadata } from './workContent'
import styles from './page.module.css'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}

/**
 * Detalle tipo B (especificacion-final-formato-detalle.md §1, §7): caso y
 * episodio comparten ruta /work/[slug] — antes el episodio vivía en
 * /channel/[slug], arquitectura previa a este rediseño. Ruta canónica —
 * siempre renderiza default_locale. Las variantes de idioma de un caso
 * viven en ./[locale]/page.tsx (§7.7); un episodio no las tiene nunca.
 *
 * `?preview=<token>` (arquitectura §15.3): permite ver un caso/episodio
 * en draft/scheduled sin sesión de admin — resolvePreviewContext valida
 * el token contra este mismo slug antes de saltarse la RLS pública.
 */
async function getWorkPreview(slug: string, previewToken: string | undefined) {
  const { content, client, isPreview } = await resolvePreviewContext(
    slug,
    previewToken,
  )
  if (!content || (content.type !== 'case' && content.type !== 'episode')) {
    return null
  }
  return { content, client, isPreview }
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { slug } = await params
  const { preview } = await searchParams
  const resolved = await getWorkPreview(slug, preview)
  if (!resolved) return {}
  return buildWorkMetadata(resolved.content, {
    client: resolved.client,
    noindex: resolved.isPreview,
  })
}

export default async function WorkPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { preview } = await searchParams
  const resolved = await getWorkPreview(slug, preview)

  if (!resolved) {
    notFound()
  }

  const { content, client } = resolved

  if (content.type === 'case') {
    const [caseDetail, carousel] = await Promise.all([
      getPublicCaseDetail(content.id, client),
      getPublicCaseCarousel(content.id, client),
    ])

    return (
      <div className={styles.page}>
        <CaseDetail
          content={content}
          caseDetail={caseDetail}
          carousel={carousel}
        />
      </div>
    )
  }

  const episode = await getPublicEpisode(content.id, client)

  // No debería pasar (todo content.type='episode' se crea junto a su fila
  // de episode), pero sin ella no hay nada que embeber — 404 defensivo
  // antes que una página rota.
  if (!episode) {
    notFound()
  }

  return (
    <div className={styles.page}>
      <EpisodeDetail content={content} episode={episode} />
    </div>
  )
}
