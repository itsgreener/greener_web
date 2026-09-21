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
 */
async function getOtherContent(slug: string) {
  const content = await getContentBySlug(slug)
  if (!content || content.type !== 'other') return null
  return content
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const content = await getOtherContent(slug)
  if (!content) return {}
  return buildContentMetadata(content)
}

export default async function VarietyPage({ params }: Props) {
  const { slug } = await params
  const content = await getOtherContent(slug)

  if (!content) {
    notFound()
  }

  return (
    <div className={styles.page}>
      <ToolInsightDetail content={content} />
    </div>
  )
}
