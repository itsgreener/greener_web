import type { Metadata } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { resolvePreviewContext } from '@/modules/content/application/resolvePreviewContext'
import { buildContentMetadata } from '@/lib/contentMetadata'
import { ToolInsightDetail } from '@/components/detail/ToolInsightDetail'
import type { PublicContentMedia } from '@/modules/content/infrastructure/publicContentSource'
import type { PinRatioValue } from '@/modules/media/domain/closestRatio'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'
import styles from './page.module.css'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string; pin?: string; slide?: string }>
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


type ToolPinCover = {
  media: PublicContentMedia
  ratio: PinRatioValue
}

type ToolPinRow = {
  id: string
  content_id: string
  ratio: PinRatioValue
  pin_media: Array<{
    media_id: string
    slide_order: number
    media_asset: {
      kind: 'image' | 'video'
      cloudinary_public_id: string
    } | null
  }>
}

/**
 * Resuelve la portada de la ficha desde el pin que originó la navegación.
 * Seguridad: el pin se filtra también por content_id, de modo que no se
 * puede usar ?pin= para inyectar el medio de otra Tool.
 *
 * Formatos soportados:
 * - pin=<pinId>                 -> pin normal / carrusel
 * - pin=<pinId>::<mediaId>      -> unidad individual de un pin no-carrusel
 * - slide=<n>                   -> slide visible de un carrusel
 */
async function getToolPinCover(
  contentId: string,
  pinRef: string | undefined,
  slideParam: string | undefined,
  client?: SupabaseClient,
): Promise<ToolPinCover | null> {
  if (!pinRef) return null

  const [pinId, mediaIdFromUnit] = pinRef.split('::', 2)
  if (!pinId) return null

  const supabase = client ?? createPublicReadClient()

  const { data, error } = await supabase
    .from('pin')
    .select(
      `
      id,
      content_id,
      ratio,
      pin_media (
        media_id,
        slide_order,
        media_asset ( kind, cloudinary_public_id )
      )
    `,
    )
    .eq('id', pinId)
    .eq('content_id', contentId)
    .maybeSingle()

  if (error || !data) return null

  const pin = data as unknown as ToolPinRow
  const media = [...pin.pin_media]
    .filter((item) => item.media_asset !== null)
    .sort((a, b) => a.slide_order - b.slide_order)

  if (media.length === 0) return null

  let selected = media[0]

  if (mediaIdFromUnit) {
    selected =
      media.find((item) => item.media_id === mediaIdFromUnit) ?? selected
  } else if (slideParam !== undefined) {
    const slideIndex = Number.parseInt(slideParam, 10)
    if (Number.isInteger(slideIndex) && slideIndex >= 0) {
      selected = media[slideIndex] ?? selected
    }
  }

  if (!selected.media_asset) return null

  return {
    ratio: pin.ratio,
    media: {
      kind: selected.media_asset.kind,
      cloudinaryPublicId: selected.media_asset.cloudinary_public_id,
    },
  }
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
  const { preview, pin, slide } = await searchParams
  const resolved = await getToolPreview(slug, preview)

  if (!resolved) {
    notFound()
  }

  const pinCover = await getToolPinCover(
    resolved.content.id,
    pin,
    slide,
    resolved.client,
  )

  return (
    <div className={styles.page}>
      <ToolInsightDetail
        content={resolved.content}
        ctaLabel="Use"
        appHref={`/tools/${slug}/app`}
        coverMediaOverride={pinCover?.media}
        coverRatioOverride={pinCover?.ratio}
      />
    </div>
  )
}
