import { createClient } from '@/lib/supabase/server'
import type { MediaKind } from '@/modules/shared/domain/mediaKind'

/**
 * Lecturas de «qué archivos de Cloudinary cuelgan de qué» que necesita la
 * limpieza de medios (cleanupMedia.ts). Van con el cliente del admin
 * (RLS: solo `is_admin()` ve `media_asset` sin publicar).
 */

export interface MediaRef {
  mediaId: string
  cloudinaryPublicId: string
  kind: MediaKind
}

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

  const content = await supabase
    .from('content')
    .select('cover_media_id, og_media_id')
    .eq('id', contentId)
    .maybeSingle()

  if (content.error) throw repositoryError(content.error.message)

  const directIds = [
    content.data?.cover_media_id,
    content.data?.og_media_id,
  ].filter((id): id is string => typeof id === 'string')

  if (directIds.length > 0) {
    const direct = await supabase
      .from('media_asset')
      .select('id, kind, cloudinary_public_id')
      .in('id', directIds)

    if (direct.error) throw repositoryError(direct.error.message)

    refs.push(...(direct.data ?? []).map(toRef))
  }

  const pins = await supabase
    .from('pin')
    .select(
      'id, pin_media ( media_id, media_asset ( id, kind, cloudinary_public_id ) )',
    )
    .eq('content_id', contentId)

  if (pins.error) throw repositoryError(pins.error.message)

  for (const pin of pins.data ?? []) {
    for (const row of pin.pin_media) {
      if (row.media_asset) refs.push(toRef(row.media_asset))
    }
  }

  const carousel = await supabase
    .from('case_detail_media')
    .select('media_id, media_asset ( id, kind, cloudinary_public_id )')
    .eq('content_id', contentId)

  if (carousel.error) throw repositoryError(carousel.error.message)

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
