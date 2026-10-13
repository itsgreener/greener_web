import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { resolvePreviewContext } from '@/modules/content/container'
import { buildContentMetadata } from '@/lib/contentMetadata'
import { ToolInsightDetail } from '@/components/detail/ToolInsightDetail'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}

/**
 * Detalle tipo A de un insight — misma plantilla que tool
 * (ToolInsightDetail: "el brief considera técnicamente equivalentes
 * insights y tools", arquitectura §12), CTA "Read" en vez de "Use".
 *
 * `?preview=<token>` (arquitectura §15.3): ver comentario equivalente en
 * /work/[slug]/page.tsx.
 */
async function getInsightPreview(
  slug: string,
  previewToken: string | undefined,
) {
  const { content, isPreview, reader } = await resolvePreviewContext(
    slug,
    previewToken,
  )
  if (!content || content.type !== 'insight') return null
  return { content, reader, isPreview }
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { slug } = await params
  const { preview } = await searchParams
  const resolved = await getInsightPreview(slug, preview)
  if (!resolved) return {}
  // Sin portada propia (§2.40): OG del primer pin del insight.
  const shareMedia = await resolved.reader.firstPinMedia(resolved.content.id)
  return buildContentMetadata(resolved.content, {
    noindex: resolved.isPreview,
    shareMedia,
  })
}

export default async function InsightPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { preview } = await searchParams
  const resolved = await getInsightPreview(slug, preview)

  if (!resolved) {
    notFound()
  }

  return (
    <>
      <ToolInsightDetail
        content={resolved.content}
        ctaLabel="Read"
        appHref={`/insights/${slug}/app`}
      />
    </>
  )
}
