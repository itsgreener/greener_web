import { createClient } from '@/lib/supabase/server'
import type { MediaKind } from '@/modules/shared/domain/mediaKind'
import type {
  MediaRef,
  MediaRefsRepository,
} from '@/modules/media/domain/mediaCleanupPorts'

/**
 * Lecturas de «qué archivos de Cloudinary cuelgan de qué» que necesita la
 * limpieza de medios (cleanupMedia.ts). Van con el cliente del admin
 * (RLS: solo `is_admin()` ve `media_asset` sin publicar).
 */

type MediaAssetRow = {
  id: string
  kind: MediaKind
  cloudinary_public_id: string
}

function repositoryError(message: string): Error {
  return new Error(`No se pudieron leer los medios: ${message}`)
}

function toRef(asset: MediaAssetRow): MediaRef {
  return {
    mediaId: asset.id,
    cloudinaryPublicId: asset.cloudinary_public_id,
    kind: asset.kind,
  }
}

function uniqueByMediaId(refs: MediaRef[]): MediaRef[] {
  return [...new Map(refs.map((ref) => [ref.mediaId, ref])).values()]
}

export async function listPinMediaRefs(pinId: string): Promise<MediaRef[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pin_media')
    .select('media_id, media_asset ( id, kind, cloudinary_public_id )')
    .eq('pin_id', pinId)

  if (error) throw repositoryError(error.message)

  return uniqueByMediaId(
    (data ?? []).flatMap((row) =>
      row.media_asset ? [toRef(row.media_asset)] : [],
    ),
  )
}

/**
 * Todos los medios que cuelgan de un contenido: portada, imagen de
 * compartición (og), medios de sus pines y carrusel de detalle (casos).
 */
export async function listContentMediaRefs(
  contentId: string,
): Promise<MediaRef[]> {
  const supabase = await createClient()

  const refs: MediaRef[] = []

  // Las tres lecturas son independientes: van a la vez. Portada y og viajan
  // embebidas en la del contenido.
  const [content, pins, carousel] = await Promise.all([
    supabase
      .from('content')
      .select(
        `
        cover:media_asset!cover_media_id ( id, kind, cloudinary_public_id ),
        og:media_asset!og_media_id ( id, kind, cloudinary_public_id )
      ` as const,
      )
      .eq('id', contentId)
      .maybeSingle(),
    supabase
      .from('pin')
      .select(
        'id, pin_media ( media_id, media_asset ( id, kind, cloudinary_public_id ) )',
      )
      .eq('content_id', contentId),
    supabase
      .from('case_detail_media')
      .select('media_id, media_asset ( id, kind, cloudinary_public_id )')
      .eq('content_id', contentId),
  ])

  if (content.error) throw repositoryError(content.error.message)
  if (pins.error) throw repositoryError(pins.error.message)
  if (carousel.error) throw repositoryError(carousel.error.message)

  for (const direct of [content.data?.cover, content.data?.og]) {
    if (direct) refs.push(toRef(direct))
  }

  for (const pin of pins.data ?? []) {
    for (const row of pin.pin_media) {
      if (row.media_asset) refs.push(toRef(row.media_asset))
    }
  }

  for (const row of carousel.data ?? []) {
    if (row.media_asset) refs.push(toRef(row.media_asset))
  }

  return uniqueByMediaId(refs)
}

/** Referencias (public id y tipo) de estos `media_asset.id`, leídas de Postgres. */
export async function listMediaRefsByIds(
  mediaIds: string[],
): Promise<MediaRef[]> {
  if (mediaIds.length === 0) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('media_asset')
    .select('id, kind, cloudinary_public_id')
    .in('id', mediaIds)

  if (error) throw repositoryError(error.message)

  return ((data ?? []) as MediaAssetRow[]).map(toRef)
}

/** De estos `media_asset.id`, cuáles siguen existiendo en Postgres. */
export async function findExistingMediaIds(
  mediaIds: string[],
): Promise<Set<string>> {
  if (mediaIds.length === 0) return new Set()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('media_asset')
    .select('id')
    .in('id', mediaIds)

  if (error) throw repositoryError(error.message)

  return new Set(((data ?? []) as { id: string }[]).map((row) => row.id))
}

/** ¿Hay alguna fila de `media_asset` con este public id de Cloudinary? */
export async function isPublicIdRegistered(publicId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('media_asset')
    .select('id')
    .eq('cloudinary_public_id', publicId)
    .limit(1)

  if (error) throw repositoryError(error.message)

  return (data ?? []).length > 0
}

export const supabaseMediaRefsRepository: MediaRefsRepository = {
  listPinMediaRefs,
  listContentMediaRefs,
  listMediaRefsByIds,
  findExistingMediaIds,
  isPublicIdRegistered,
}
