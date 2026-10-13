import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { resolvePreviewContext } from '@/modules/content/container'
import { buildContentMetadata } from '@/lib/contentMetadata'
import { ToolInsightDetail } from '@/components/detail/ToolInsightDetail'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string; pin?: string }>
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
  const { content, reader, isPreview } = await resolvePreviewContext(
    slug,
    previewToken,
  )
  if (!content || content.type !== 'tool') return null
  return { content, reader, isPreview }
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { slug } = await params
  const { preview, pin } = await searchParams
  const resolved = await getToolPreview(slug, preview)
  if (!resolved) return {}
  // Sin portada propia (§2.40): OG del pin pedido (?pin=) o, si no, del
  // primer pin de la tool.
  const pinCover = pin
    ? await resolved.reader.pinCover(resolved.content.id, pin)
    : null
  const shareMedia =
    pinCover?.media ??
    (await resolved.reader.firstPinMedia(resolved.content.id))
  return buildContentMetadata(resolved.content, {
    noindex: resolved.isPreview,
    shareMedia,
  })
}

export default async function ToolPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { preview, pin } = await searchParams
  const resolved = await getToolPreview(slug, preview)

  if (!resolved) {
    notFound()
  }

  const pinCover = pin
    ? await resolved.reader.pinCover(resolved.content.id, pin)
    : null

  return (
    <>
      <ToolInsightDetail
        content={resolved.content}
        ctaLabel="Use"
        appHref={`/tools/${slug}/app`}
        coverMediaOverride={pinCover?.media}
        coverRatioOverride={pinCover?.ratio}
        coverAltOverride={pinCover?.alt}
      />
    </>
  )
}
