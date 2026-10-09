import type { AppSupabaseClient, Tables } from '@/lib/supabase/database'
import type { ContentStatus } from '@/modules/shared/domain/contentStatus'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/serviceClient'

import type { VideoUsage } from '../domain/warmPlan'

import {
  pinRatioSchema,
  type PinRatioValue,
} from '@/modules/shared/domain/ratio'
/**
 * Lecturas y escrituras del calentamiento de vídeos (fase 2, contrato §9).
 *
 *  - Las LECTURAS van con el cliente del admin (RLS: solo `is_admin()` ve
 *    lo que aún no está publicado).
 *  - La ESCRITURA (`mark_media_asset_warmed`) puede ir con el cliente del
 *    admin o con el de servicio: la función admite a los dos. El de servicio
 *    existe para lo que corre en `after()`, donde la sesión (cookies) no está
 *    garantizada.
 */

export interface WarmCandidate {
  mediaId: string
  cloudinaryPublicId: string
  warmedContract: string | null
  usages: VideoUsage[]
}

export interface ContentWarmInfo {
  status: ContentStatus
  candidates: WarmCandidate[]
}

type VideoAssetRow = Pick<
  Tables<'media_asset'>,
  | 'id'
  | 'kind'
  | 'cloudinary_public_id'
  | 'width'
  | 'height'
  | 'duration_seconds'
  | 'warmed_contract'
>

// `as const` en las plantillas: supabase-js deduce los tipos de la fila a
// partir del literal del select, y una plantilla sin `as const` es `string`.
const ASSET_COLUMNS =
  'id, kind, cloudinary_public_id, width, height, duration_seconds, warmed_contract' as const

function readError(message: string): Error {
  return new Error(`No se pudieron leer los vídeos a calentar: ${message}`)
}

function isRatio(value: unknown): value is PinRatioValue {
  return (
    typeof value === 'string' &&
    (pinRatioSchema.options as readonly string[]).includes(value)
  )
}

/**
 * Todos los vídeos de un contenido con DÓNDE se usan: pines (con su ratio,
 * modo de reproducción y tipo de contenido), carrusel de casos y portada.
 * Un mismo vídeo puede aparecer con varios usos.
 */
export async function readContentWarmInfo(
  contentId: string,
): Promise<ContentWarmInfo> {
  const supabase = await createClient()

  const content = await supabase
    .from('content')
    .select('type, status, cover_media_id, cover_ratio')
    .eq('id', contentId)
    .maybeSingle()

  if (content.error) throw readError(content.error.message)
  if (!content.data) throw readError('el contenido no existe.')

  const kind = content.data.type
  const byId = new Map<string, WarmCandidate>()

  function add(asset: VideoAssetRow, usage: VideoUsage) {
    if (asset.kind !== 'video') return

    const current = byId.get(asset.id) ?? {
      mediaId: asset.id,
      cloudinaryPublicId: asset.cloudinary_public_id,
      warmedContract: asset.warmed_contract,
      usages: [],
    }

    current.usages.push(usage)
    byId.set(asset.id, current)
  }

  const pins = await supabase
    .from('pin')
    .select(
      `ratio, autoplay_mode, pin_media ( media_asset ( ${ASSET_COLUMNS} ) )` as const,
    )
    .eq('content_id', contentId)

  if (pins.error) throw readError(pins.error.message)

  for (const pin of pins.data ?? []) {
    if (!isRatio(pin.ratio)) continue

    for (const row of pin.pin_media) {
      if (!row.media_asset) continue

      add(row.media_asset, {
        kind: 'pin',
        contentType: kind,
        pinRatio: pin.ratio,
        durationSeconds: row.media_asset.duration_seconds,
        autoplayMode: pin.autoplay_mode,
      })
    }
  }

  const carousel = await supabase
    .from('case_detail_media')
    .select(`media_asset ( ${ASSET_COLUMNS} )` as const)
    .eq('content_id', contentId)

  if (carousel.error) throw readError(carousel.error.message)

  for (const row of carousel.data ?? []) {
    const asset = row.media_asset

    if (asset && asset.width && asset.height) {
      add(asset, {
        kind: 'caseCarousel',
        width: asset.width,
        height: asset.height,
      })
    }
  }

  // La portada solo existe en contenido libre («other»).
  if (kind === 'other' && content.data.cover_media_id) {
    const cover = await supabase
      .from('media_asset')
      .select(ASSET_COLUMNS)
      .eq('id', content.data.cover_media_id)
      .maybeSingle()

    if (cover.error) throw readError(cover.error.message)

    if (cover.data) {
      add(cover.data, {
        kind: 'otherCover',
        coverRatio: isRatio(content.data.cover_ratio)
          ? content.data.cover_ratio
          : null,
      })
    }
  }

  return {
    status: content.data.status,
    candidates: [...byId.values()],
  }
}

/** Contenido al que pertenece un pin (null si el pin ya no existe). */
export async function readPinContentId(pinId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pin')
    .select('content_id')
    .eq('id', pinId)
    .maybeSingle()

  if (error) throw readError(error.message)

  return data?.content_id ?? null
}

export type WarmMarker = (
  mediaId: string,
  contract: string,
  error?: string | null,
) => Promise<void>

async function callMark(
  client: AppSupabaseClient,
  mediaId: string,
  contract: string,
  error?: string | null,
) {
  const { error: rpcError } = await client.rpc('mark_media_asset_warmed', {
    p_media_id: mediaId,
    p_contract: contract,
    p_error: error ?? null,
  })

  if (rpcError) {
    throw new Error(
      `No se pudo anotar el calentamiento del medio: ${rpcError.message}`,
    )
  }
}

/** Anota con la sesión del admin (botón del ABM). */
export const markWarmedWithSession: WarmMarker = async (...args) => {
  await callMark(await createClient(), ...args)
}

/** Anota con la clave de servicio (tareas en `after()`, sin sesión fiable). */
export const markWarmedWithService: WarmMarker = async (...args) => {
  await callMark(createServiceClient(), ...args)
}
