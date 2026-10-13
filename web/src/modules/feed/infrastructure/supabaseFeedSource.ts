import type { AppSupabaseClient } from '@/lib/supabase/database'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'
import { derivedFeedText } from '@/modules/content/domain/pinFooter'
import type { ContentType } from '@/modules/shared/domain/contentType'
import { feedRatiosSchema } from '@/modules/feed/domain/feedConfigSchema'
import type { FeedCatalog } from '@/modules/feed/domain/feedPorts'
import type {
  FeedDataset,
  FeedItemMedia,
  PinDirectoryEntry,
} from '@/modules/feed/domain/feedReadModels'
import {
  CONTENT_TYPE_TO_KIND,
  typesForScope,
} from '@/modules/feed/domain/feedScope'
import type {
  CaseInput,
  ContentPinQueue,
  FeedConfig,
  FeedSnapshot,
} from '@/modules/feed/domain/types'

type ContentTranslationRow = {
  locale: string
  title: string
}

type FeedContentMeta = {
  id: string
  type: ContentType
  slug: string
  default_locale?: string
  content_translation?: ContentTranslationRow[]
  case_detail?: {
    force?: number
    client?: string | null
  } | null
  episode?: {
    program?: string | null
    episode_kind?: string | null
  } | null
}

interface PinRow {
  id: string
  ratio: string
  label: string | null
  language: string
  alt: string
  queue_order: number
  autoplay_mode: 'viewport' | 'hover' | null
  pin_media: {
    media_id: string
    slide_order: number
    media_asset: {
      kind: 'image' | 'video'
      cloudinary_public_id: string
      duration_seconds?: number | null
    } | null
  }[]
}

// `as const` en este literal y en las plantillas que lo usan: supabase-js
// deduce el tipo de la fila a partir del texto del select, y sin `as const`
// una plantilla con interpolación es un `string` cualquiera.
const PIN_SELECT = `
  id, ratio, label, language, alt, queue_order, autoplay_mode,
  pin_media (
    media_id,
    slide_order,
    media_asset ( kind, cloudinary_public_id, duration_seconds )
  )
` as const

/**
 * Convierte un pin en su unidad de feed (§2.41): un pin es un único medio
 * y cada pin es una unidad independiente — unitId = pin.id. Los pines sin
 * ningún medio listo no producen ninguna unidad (§8.2: "el pin necesita
 * al menos un medio listo").
 */
export function buildFeedUnitsForPin(
  pin: PinRow,
  content: FeedContentMeta,
): { unitId: string; entry: PinDirectoryEntry }[] {
  const first = [...pin.pin_media]
    .sort((a, b) => a.slide_order - b.slide_order)
    .filter((pm) => pm.media_asset !== null)[0]

  if (!first) return []

  const media = {
    kind: first.media_asset!.kind,
    cloudinaryPublicId: first.media_asset!.cloudinary_public_id,
    durationSeconds: first.media_asset!.duration_seconds ?? null,
  }

  const text = derivedFeedText(
    { label: pin.label, language: pin.language },
    {
      type: content.type,
      defaultLocale: content.default_locale,
      translations: content.content_translation ?? [],
      caseClient: content.case_detail?.client,
      episodeProgram: content.episode?.program,
      episodeKind: content.episode?.episode_kind,
    },
  )

  return [
    {
      unitId: pin.id,
      entry: {
        contentId: content.id,
        contentType: content.type,
        contentSlug: content.slug,
        ratio: pin.ratio,
        label: text.label,
        displayTitle: text.displayTitle,
        displaySecondary: text.displaySecondary,
        alt: pin.alt,
        autoplayMode: pin.autoplay_mode,
        media: [toFeedItemMedia(media)],
      },
    },
  ]
}

function toFeedItemMedia(m: {
  kind: 'image' | 'video'
  cloudinaryPublicId: string
  durationSeconds: number | null
}): FeedItemMedia {
  // La duración solo viaja en vídeo: en imagen no significa nada.
  return m.kind === 'video'
    ? {
        kind: m.kind,
        cloudinaryPublicId: m.cloudinaryPublicId,
        durationSeconds: m.durationSeconds,
      }
    : { kind: m.kind, cloudinaryPublicId: m.cloudinaryPublicId }
}

/**
 * Construye el FeedSnapshot real desde Supabase: todo el contenido
 * publicado con al menos un pin, agrupado por tipo (arquitectura §7,
 * §8.2).
 *
 * Usa el cliente de lectura pública (respeta RLS: solo status=published,
 * §15.2/§17.1) — no hace falta la service role key para esto, a
 * diferencia de feed_session/feed_round (ver serviceClient.ts).
 *
 * `scope` filtra qué tipos de contenido entran en el universo (ver
 * typesForScope). Un scope desconocido cae en 'home'; createFeedSession.ts
 * ya lo valida antes, así que eso es solo defensivo.
 */
export async function getFeedDataset(
  scope: string,
  excludeContentId?: string | null,
  client: AppSupabaseClient = createPublicReadClient(),
): Promise<FeedDataset> {
  const types = typesForScope(scope)

  let query = client
    .from('content')
    .select(
      `
      id,
      type,
      slug,
      default_locale,
      content_translation ( locale, title ),
      case_detail ( force, client ),
      episode ( program, episode_kind ),
      pin ( ${PIN_SELECT} )
    ` as const,
    )
    .eq('status', 'published')
    .in('type', [...types])

  // Panel de recomendaciones de una página de detalle
  // (especificacion-final-formato-detalle.md §1, §6): el contenido que se
  // está viendo se excluye del universo ANTES de que generateRound lo vea
  // — no filtrando la tanda ya generada, que rompería el tamaño real que
  // espera la virtualización (§10.2).
  if (excludeContentId) {
    query = query.neq('id', excludeContentId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(
      `No se pudo construir el snapshot del feed desde Supabase: ${error.message}`,
    )
  }

  const snapshot: FeedSnapshot = {
    cases: [],
    insights: [],
    tools: [],
    channel: [],
    other: [],
  }
  const pinDirectory: Record<string, PinDirectoryEntry> = {}

  for (const content of data ?? []) {
    const kind = CONTENT_TYPE_TO_KIND[content.type]
    if (!kind) continue // tipo desconocido — no debería pasar con el filtro .in() de arriba

    const orderedPins = [...content.pin].sort(
      (a, b) => a.queue_order - b.queue_order,
    )
    const unitIds: string[] = []

    for (const pin of orderedPins) {
      for (const unit of buildFeedUnitsForPin(pin, content)) {
        unitIds.push(unit.unitId)
        pinDirectory[unit.unitId] = unit.entry
      }
    }

    if (unitIds.length === 0) continue // sin unidades servibles: no entra en el universo del feed

    if (kind === 'cases') {
      const caseInput: CaseInput = {
        contentId: content.id,
        pinIds: unitIds,
        force: content.case_detail?.force ?? 1,
      }
      snapshot.cases.push(caseInput)
    } else {
      const queue: ContentPinQueue = { contentId: content.id, pinIds: unitIds }
      ;(snapshot[kind] as ContentPinQueue[]).push(queue)
    }
  }

  return { snapshot, pinDirectory }
}

/**
 * Enriquece una lista de unitIds ya decidida (por ejemplo, una ronda
 * leída de feed_round) sin releer todo el catálogo publicado — a
 * diferencia de getFeedDataset(), que sí necesita el universo completo
 * para generar una ronda nueva. Preserva el orden de `unitIds`, no el
 * que devuelva Supabase.
 *
 * Un unitId es un pin.id (§2.41). Se consulta una sola vez por pin aunque
 * el mismo pin aparezca varias veces en la lista (el feed repite por
 * diseño).
 */
export async function getPinDirectoryByIds(
  unitIds: string[],
  client: AppSupabaseClient = createPublicReadClient(),
): Promise<Record<string, PinDirectoryEntry>> {
  if (unitIds.length === 0) return {}

  const pinIds = [...new Set(unitIds)]

  const { data, error } = await client
    .from('pin')
    .select(
      `
      ${PIN_SELECT},
      content (
        id,
        type,
        slug,
        default_locale,
        content_translation ( locale, title ),
        case_detail ( client ),
        episode ( program, episode_kind )
      )
    ` as const,
    )
    .in('id', pinIds)

  if (error) {
    throw new Error(
      `No se pudieron enriquecer los pines de la ronda: ${error.message}`,
    )
  }

  const directory: Record<string, PinDirectoryEntry> = {}
  for (const pin of data ?? []) {
    if (!pin.content) continue
    for (const unit of buildFeedUnitsForPin(pin, pin.content)) {
      directory[unit.unitId] = unit.entry
    }
  }
  return directory
}

/** Lee la fila única de feed_config (§7.5, §8.1) y la traduce a FeedConfig. */
export async function getFeedConfig(
  client: AppSupabaseClient = createPublicReadClient(),
): Promise<FeedConfig> {
  const { data, error } = await client
    .from('feed_config')
    .select('ratios, batch_size, mix_window, distance_window')
    .single()

  if (error || !data) {
    throw new Error(
      `No se pudo leer feed_config: ${error?.message ?? 'fila no encontrada'}`,
    )
  }

  const ratios = feedRatiosSchema.safeParse(data.ratios)

  if (!ratios.success) {
    throw new Error('feed_config.ratios no tiene la forma esperada')
  }

  return {
    ratios: ratios.data,
    mixWindow: data.mix_window,
    distanceWindow: data.distance_window,
    batchSize: data.batch_size,
  }
}

export const supabaseFeedCatalog: FeedCatalog = {
  dataset: (scope, excludeContentId) => getFeedDataset(scope, excludeContentId),
  directoryByIds: (unitIds) => getPinDirectoryByIds(unitIds),
  config: () => getFeedConfig(),
}
