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
 * Detalle de contenido libre (`other`, especificacion-final-formato-
 * detalle.md §1, §3, §7): mismo formato que tool/
 * insight (ToolInsightDetail ya admite portada de vídeo y CTA opcional
 * para este caso), sin CTA y sin paquete HTML.
 *
 * Ruta con prefijo propio (`/variety/[slug]`, no `/[slug]` a nivel raíz):
 * evita colisiones con /work, /tools, /insights, /channel, /contact, /admin…
 * sin mantener una lista de palabras reservadas que validar en el ABM cada
 * vez que se añade una ruta.
 *
 * `?preview=<token>` (arquitectura §15.3): ver comentario equivalente en
 * /work/[slug]/page.tsx.
 */
async function getOtherPreview(slug: string, previewToken: string | undefined) {
  const { content, reader, isPreview } = await resolvePreviewContext(
    slug,
    previewToken,
  )
  if (!content || content.type !== 'other') return null
  return { content, reader, isPreview }
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
    <>
      <ToolInsightDetail content={resolved.content} />
    </>
  )
}
