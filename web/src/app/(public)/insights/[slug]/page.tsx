import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getContentBySlug } from '@/modules/content/application/getContentBySlug'
import { buildContentMetadata } from '@/lib/contentMetadata'
import { ToolInsightDetail } from '@/components/detail/ToolInsightDetail'
import styles from './page.module.css'

type Props = {
  params: Promise<{ slug: string }>
}

/**
 * Detalle tipo A de un insight — misma plantilla que tool
 * (ToolInsightDetail: "el brief considera técnicamente equivalentes
 * insights y tools", arquitectura §12), CTA "Read" en vez de "Use".
 */
async function getInsightContent(slug: string) {
  const content = await getContentBySlug(slug)
  if (!content || content.type !== 'insight') return null
  return content
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const content = await getInsightContent(slug)
  if (!content) return {}
  return buildContentMetadata(content)
}

export default async function InsightPage({ params }: Props) {
  const { slug } = await params
  const content = await getInsightContent(slug)

  if (!content) {
    notFound()
  }

  return (
    <div className={styles.page}>
      <ToolInsightDetail
        content={content}
        ctaLabel="Read"
        appHref={`/insights/${slug}/app`}
      />
    </div>
  )
}
