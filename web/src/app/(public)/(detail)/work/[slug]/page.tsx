import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { resolvePreviewContext } from '@/modules/content/container'
import { ContentOpenTracker } from '@/modules/analytics/ContentOpenTracker'
import { CaseDetail } from '@/components/detail/CaseDetail'
import { EpisodeDetail } from '@/components/detail/EpisodeDetail'
import { buildWorkMetadata } from './workContent'

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
  const { content, reader, isPreview } = await resolvePreviewContext(
    slug,
    previewToken,
  )
  if (!content || (content.type !== 'case' && content.type !== 'episode')) {
    return null
  }
  return { content, reader, isPreview }
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
    reader: resolved.reader,
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

  const { content, reader, isPreview } = resolved

  if (content.type === 'case') {
    const [caseDetail, carousel] = await Promise.all([
      reader.caseDetail(content.id),
      reader.caseCarousel(content.id),
    ])

    return (
      <>
        {/* ContentOpenTracker ya excluye ?preview= por su cuenta (lee la
            URL directamente); el `!isPreview` de aquí es defensa adicional,
            sin coste, porque ya tenemos el dato a mano. */}
        {!isPreview && (
          <ContentOpenTracker type="case" contentId={content.id} />
        )}
        <CaseDetail
          content={content}
          caseDetail={caseDetail}
          carousel={carousel}
        />
      </>
    )
  }

  const episode = await reader.episode(content.id)

  // No debería pasar (todo content.type='episode' se crea junto a su fila
  // de episode), pero sin ella no hay nada que embeber — 404 defensivo
  // antes que una página rota.
  if (!episode) {
    notFound()
  }

  return (
    <>
      <EpisodeDetail content={content} episode={episode} />
    </>
  )
}
