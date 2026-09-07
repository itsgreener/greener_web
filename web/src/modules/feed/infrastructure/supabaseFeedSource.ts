import type { SupabaseClient } from '@supabase/supabase-js'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'
import type {
  CaseInput,
  ContentPinQueue,
  FeedConfig,
  FeedSnapshot,
} from '../domain/types'

export interface PinDirectoryEntry {
  contentId: string
  contentType: 'case' | 'insight' | 'tool' | 'episode' | 'page'
  contentSlug: string
  ratio: string
  label: string
  cta: string | null
  alt: string
  cloudinaryPublicId: string
}

export interface FeedDataset {
  snapshot: FeedSnapshot
  pinDirectory: Record<string, PinDirectoryEntry>
}

const CONTENT_TYPE_TO_KIND: Record<string, keyof FeedSnapshot> = {
  case: 'cases',
  insight: 'insights',
  tool: 'tools',
  episode: 'channel',
  page: 'other',
}

interface ContentRow {
  id: string
  type: string
  slug: string
  case_detail: { force: number } | null
  pin: PinRow[]
}

interface PinRow {
  id: string
  ratio: string
  label: string
  cta: string | null
  alt: string
  queue_order: number
  pin_media: {
    slide_order: number
    media_asset: { cloudinary_public_id: string } | null
  }[]
}

/**
 * Construye el FeedSnapshot real desde Supabase: todo el contenido
 * publicado con al menos un pin, agrupado por tipo (arquitectura §7,
 * §8.2). Reemplaza a modules/feed/infrastructure/demoSnapshotSource.ts
 * tal como ya preveía su propio comentario ("stand-in deliberado").
 *
 * Usa el cliente de lectura pública (respeta RLS: solo status=published,
 * §15.2/§17.1) — no hace falta la service role key para esto, a
 * diferencia de feed_session/feed_round (ver serviceClient.ts).
 *
 * MVP: solo cubre scope "home" (todo el catálogo publicado, sin filtro
 * de etiquetas). Subhomes y scope=related-cases quedan para la Fase 3
 * (arquitectura Anexo E.4), cuando haga falta filtrar por tag.
 */
export async function getFeedDataset(
  client: SupabaseClient = createPublicReadClient(),
): Promise<FeedDataset> {
  const { data, error } = await client
    .from('content')
    .select(
      `
      id,
      type,
      slug,
      case_detail ( force ),
      pin (
        id, ratio, label, cta, alt, queue_order,
        pin_media (
          slide_order,
          media_asset ( cloudinary_public_id )
        )
      )
    `,
    )
    .eq('status', 'published')
    .in('type', ['case', 'insight', 'tool', 'episode', 'page'])
    .returns<ContentRow[]>()

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
    const pinIds: string[] = []

    for (const pin of orderedPins) {
      // El pin necesita al menos un medio listo (slide_order 0 para el
      // caso normal; para carruseles, el primero es el representativo en
      // el feed — el resto de slides se sirven en el detalle, no aquí).
      const primaryMedia = [...pin.pin_media].sort(
        (a, b) => a.slide_order - b.slide_order,
      )[0]
      const cloudinaryPublicId = primaryMedia?.media_asset?.cloudinary_public_id
      if (!cloudinaryPublicId) continue // pin sin medio listo: no se ofrece en el feed

      pinIds.push(pin.id)
      pinDirectory[pin.id] = {
        contentId: content.id,
        contentType: content.type as PinDirectoryEntry['contentType'],
        contentSlug: content.slug,
        ratio: pin.ratio,
        label: pin.label,
        cta: pin.cta,
        alt: pin.alt,
        cloudinaryPublicId,
      }
    }

    if (pinIds.length === 0) continue // sin pines servibles: no entra en el universo del feed

    if (kind === 'cases') {
      const caseInput: CaseInput = {
        contentId: content.id,
        pinIds,
        force: content.case_detail?.force ?? 1,
      }
      snapshot.cases.push(caseInput)
    } else {
      const queue: ContentPinQueue = { contentId: content.id, pinIds }
      ;(snapshot[kind] as ContentPinQueue[]).push(queue)
    }
  }

  return { snapshot, pinDirectory }
}

interface PinLookupRow {
  id: string
  ratio: string
  label: string
  cta: string | null
  alt: string
  content: { id: string; type: string; slug: string } | null
  pin_media: {
    slide_order: number
    media_asset: { cloudinary_public_id: string } | null
  }[]
}

/**
 * Enriquece una lista de pinIds ya decidida (por ejemplo, una ronda leída
 * de feed_round) sin releer todo el catálogo publicado — a diferencia de
 * getFeedDataset(), que sí necesita el universo completo para generar una
 * ronda nueva. Preserva el orden de `pinIds`, no el que devuelva Supabase.
 */
export async function getPinDirectoryByIds(
  pinIds: string[],
  client: SupabaseClient = createPublicReadClient(),
): Promise<Record<string, PinDirectoryEntry>> {
  if (pinIds.length === 0) return {}

  const { data, error } = await client
    .from('pin')
    .select(
      `
      id, ratio, label, cta, alt,
      content ( id, type, slug ),
      pin_media ( slide_order, media_asset ( cloudinary_public_id ) )
    `,
    )
    .in('id', pinIds)
    .returns<PinLookupRow[]>()

  if (error) {
    throw new Error(
      `No se pudieron enriquecer los pines de la ronda: ${error.message}`,
    )
  }

  const directory: Record<string, PinDirectoryEntry> = {}
  for (const pin of data ?? []) {
    if (!pin.content) continue
    const primaryMedia = [...pin.pin_media].sort(
      (a, b) => a.slide_order - b.slide_order,
    )[0]
    const cloudinaryPublicId = primaryMedia?.media_asset?.cloudinary_public_id
    if (!cloudinaryPublicId) continue

    directory[pin.id] = {
      contentId: pin.content.id,
      contentType: pin.content.type as PinDirectoryEntry['contentType'],
      contentSlug: pin.content.slug,
      ratio: pin.ratio,
      label: pin.label,
      cta: pin.cta,
      alt: pin.alt,
      cloudinaryPublicId,
    }
  }
  return directory
}

interface FeedConfigRow {
  ratios: {
    cases: number
    insights: number
    tools: number
    channel: number
    other: number
  }
  batch_size: number
  mix_window: number
  distance_window: number
}

/** Lee la fila única de feed_config (§7.5, §8.1) y la traduce a FeedConfig. */
export async function getFeedConfig(
  client: SupabaseClient = createPublicReadClient(),
): Promise<{ config: FeedConfig; batchSize: number }> {
  const { data, error } = await client
    .from('feed_config')
    .select('ratios, batch_size, mix_window, distance_window')
    .single<FeedConfigRow>()

  if (error || !data) {
    throw new Error(
      `No se pudo leer feed_config: ${error?.message ?? 'fila no encontrada'}`,
    )
  }

  return {
    config: {
      ratios: data.ratios,
      mixWindow: data.mix_window,
      distanceWindow: data.distance_window,
    },
    batchSize: data.batch_size,
  }
}
