import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { resolvePreviewContext } from '@/modules/content/application/resolvePreviewContext'
import { buildContentMetadata } from '@/lib/contentMetadata'
import { getFirstPinMedia } from '@/modules/content/infrastructure/firstPinMedia'
import { ToolInsightDetail } from '@/components/detail/ToolInsightDetail'
import styles from './page.module.css'

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
  const { content, client, isPreview } = await resolvePreviewContext(
    slug,
    previewToken,
  )
  if (!content || content.type !== 'insight') return null
  return { content, client, isPreview }
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
  const shareMedia = await getFirstPinMedia(
    resolved.content.id,
    resolved.client,
  )
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
    <div className={styles.page}>
      <ToolInsightDetail
        content={resolved.content}
        ctaLabel="Read"
        appHref={`/insights/${slug}/app`}
      />
    </div>
  )
}
