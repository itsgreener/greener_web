import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { resolvePreviewContext } from '@/modules/content/application/resolvePreviewContext'
import { buildContentMetadata } from '@/lib/contentMetadata'
import { ToolInsightDetail } from '@/components/detail/ToolInsightDetail'
import styles from './page.module.css'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}

/**
 * Detalle tipo A de una tool (especificacion-final-formato-detalle.md
 * §1, §3, §7): portada + título + summary + CTA "Use" hacia el HTML real
 * del paquete, servido en /tools/[slug]/app (esta ruta, sin /app, es la
 * envolvente — ver el comentario de esa ruta).
 *
 * `?preview=<token>` (arquitectura §15.3): ver comentario equivalente en
 * /work/[slug]/page.tsx.
 */
async function getToolPreview(slug: string, previewToken: string | undefined) {
  const { content, client, isPreview } = await resolvePreviewContext(
    slug,
    previewToken,
  )
  if (!content || content.type !== 'tool') return null
  return { content, client, isPreview }
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { slug } = await params
  const { preview } = await searchParams
  const resolved = await getToolPreview(slug, preview)
  if (!resolved) return {}
  return buildContentMetadata(resolved.content, { noindex: resolved.isPreview })
}

export default async function ToolPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { preview } = await searchParams
  const resolved = await getToolPreview(slug, preview)

  if (!resolved) {
    notFound()
  }

  return (
    <div className={styles.page}>
      <ToolInsightDetail
        content={resolved.content}
        ctaLabel="Use"
        appHref={`/tools/${slug}/app`}
      />
    </div>
  )
}
