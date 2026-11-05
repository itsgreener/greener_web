import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  resolveDetailCover,
  resolvePreviewOfType,
} from '@/modules/content/container'
import { buildContentMetadata } from '@/lib/contentMetadata'
import { ToolInsightDetail } from '@/components/detail/ToolInsightDetail'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string; pin?: string }>
}

/**
 * Detalle tipo A de una tool (especificacion-final-formato-detalle.md
 * §1, §3, §7): portada (el pin de `?pin=` o, sin él, el primer pin) + título +
 * summary + CTA "Use" hacia el HTML real
 * del paquete, servido en /tools/[slug]/app (esta ruta, sin /app, es la
 * envolvente — ver el comentario de esa ruta).
 *
 * `?preview=<token>` (arquitectura §15.3): ver comentario equivalente en
 * /work/[slug]/page.tsx.
 */
function getToolPreview(slug: string, previewToken: string | undefined) {
  return resolvePreviewOfType(slug, previewToken, ['tool'])
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
  // primer pin de la tool. El lector memoriza por petición, así que la
  // página reutiliza esta misma lectura.
  const cover = await resolveDetailCover(
    resolved.reader,
    resolved.content.id,
    pin,
  )
  return buildContentMetadata(resolved.content, {
    noindex: resolved.isPreview,
    shareMedia: cover?.media ?? null,
  })
}

export default async function ToolPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { preview, pin } = await searchParams
  const resolved = await getToolPreview(slug, preview)

  if (!resolved) {
    notFound()
  }

  const cover = await resolveDetailCover(
    resolved.reader,
    resolved.content.id,
    pin,
  )

  return (
    <ToolInsightDetail
      content={resolved.content}
      ctaLabel="Use"
      appHref={`/tools/${slug}/app`}
      cover={cover}
    />
  )
}
