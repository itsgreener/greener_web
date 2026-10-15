import type { AppSupabaseClient, Tables } from '@/lib/supabase/database'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/serviceClient'

import type { VideoUsage } from '@/modules/media/domain/warmPlan'
import type {
  ContentWarmInfo,
  WarmCandidate,
  WarmMarker,
  WarmRepository,
} from '@/modules/media/domain/warmRepository'

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
 * modo de reproducción y tipo de contenido), carrusel de casos.
 * Un mismo vídeo puede aparecer con varios usos.
 */
export async function readContentWarmInfo(
  contentId: string,
): Promise<ContentWarmInfo> {
  const supabase = await createClient()

  // Las tres lecturas son independientes: van a la vez.
  const [content, pins, carousel] = await Promise.all([
    supabase
      .from('content')
      .select('type, status')
      .eq('id', contentId)
      .maybeSingle(),
    supabase
      .from('pin')
      .select(
        `ratio, autoplay_mode, pin_media ( media_asset ( ${ASSET_COLUMNS} ) )` as const,
      )
      .eq('content_id', contentId),
    supabase
      .from('case_detail_media')
      .select(`media_asset ( ${ASSET_COLUMNS} )` as const)
      .eq('content_id', contentId),
  ])

  if (content.error) throw readError(content.error.message)
  if (!content.data) throw readError('el contenido no existe.')
  if (pins.error) throw readError(pins.error.message)
  if (carousel.error) throw readError(carousel.error.message)

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

export const supabaseWarmRepository: WarmRepository = {
  readContentWarmInfo,
  readPinContentId,
  markWithSession: markWarmedWithSession,
  markWithService: markWarmedWithService,
}
