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
 * Detalle de contenido libre (`other`, especificacion-final-formato-
 * detalle.md §1, §3, §7 ampliado el 21 sep): mismo formato que tool/
 * insight (ToolInsightDetail ya admite portada de vídeo y CTA opcional
 * para este caso), sin CTA y sin paquete HTML.
 *
 * Ruta con prefijo propio (`/variety/[slug]`, no `/[slug]` a nivel
 * raíz) — decisión del 21 sep: evita cualquier colisión futura con
 * /work, /tools, /insights, /channel, /contact, /admin, /preview, sin
 * necesidad de mantener una lista de palabras reservadas que validar en
 * el ABM cada vez que se añade una ruta nueva al sitio.
 *
 * `?preview=<token>` (arquitectura §15.3): ver comentario equivalente en
 * /work/[slug]/page.tsx.
 */
async function getOtherPreview(slug: string, previewToken: string | undefined) {
  const { content, client, isPreview } = await resolvePreviewContext(
    slug,
    previewToken,
  )
  if (!content || content.type !== 'other') return null
  return { content, client, isPreview }
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { slug } = await params
  const { preview } = await searchParams
  const resolved = await getOtherPreview(slug, preview)
  if (!resolved) return {}
  return buildContentMetadata(resolved.content, { noindex: resolved.isPreview })
}

export default async function VarietyPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { preview } = await searchParams
  const resolved = await getOtherPreview(slug, preview)

  if (!resolved) {
    notFound()
  }

  return (
    <div className={styles.page}>
      <ToolInsightDetail content={resolved.content} />
    </div>
  )
}
