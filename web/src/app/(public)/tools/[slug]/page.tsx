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
 * Detalle tipo A de una tool (especificacion-final-formato-detalle.md
 * §1, §3, §7): portada + título + summary + CTA "Use" hacia el HTML real
 * del paquete, servido en /tools/[slug]/app (esta ruta, sin /app, es la
 * envolvente — ver el comentario de esa ruta).
 */
async function getToolContent(slug: string) {
  const content = await getContentBySlug(slug)
  if (!content || content.type !== 'tool') return null
  return content
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const content = await getToolContent(slug)
  if (!content) return {}
  return buildContentMetadata(content)
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params
  const content = await getToolContent(slug)

  if (!content) {
    notFound()
  }

  return (
    <div className={styles.page}>
      <ToolInsightDetail
        content={content}
        ctaLabel="Use"
        appHref={`/tools/${slug}/app`}
      />
    </div>
  )
}
