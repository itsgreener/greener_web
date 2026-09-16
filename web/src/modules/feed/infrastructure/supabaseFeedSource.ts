import type { SupabaseClient } from '@supabase/supabase-js'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'
import type {
  CaseInput,
  ContentPinQueue,
  FeedConfig,
  FeedSnapshot,
} from '../domain/types'

export interface FeedItemMedia {
  kind: 'image' | 'video'
  cloudinaryPublicId: string
}

export interface PinDirectoryEntry {
  contentId: string
  contentType: 'case' | 'insight' | 'tool' | 'episode' | 'other'
  contentSlug: string
  ratio: string
  // §3 "Pin (todos los tipos)": obligatorio en tool/insight/libre,
  // opcional (no se muestra) en caso/episodio.
  label: string | null
  alt: string
  // Solo tiene efecto real en un pin de un único medio de vídeo (§9.1):
  // 'viewport' lo reproduce vía IntersectionObserver (compite por el
  // hueco global del feed, videoPlaybackCoordinator.ts), 'hover' solo
  // mientras el puntero está encima (no compite por el hueco — es una
  // acción explícita del usuario, no reproducción ambiental), null no
  // reproduce nunca. El slide activo de un carrusel siempre reproduce
  // si tiene hueco, sin mirar este campo — es un comportamiento distinto
  // ya decidido (ver PinCard/index.tsx).
  autoplayMode: 'viewport' | 'hover' | null
  // 1 elemento en el caso normal; más de uno solo cuando el pin se
  // agrupa como carrusel (show_as_carousel = true) — si está
  // desactivado, cada medio ya llega aquí como su propia entrada de
  // directorio (ver buildFeedUnitsForPin).
  media: FeedItemMedia[]
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
  other: 'other',
}

/**
 * Qué tipos de contenido entran en el universo según el scope de la
 * feedSession (arquitectura §6.1, §8.2). 'home' es el feed mixto de
 * siempre; cada subhome filtra a un único tipo — "el 100% de los
 * contenidos del scope forma el universo", no una mezcla con cuotas.
 * 'other' no tiene subhome propia (no hay ruta /other en el brief), así
 * que no aparece como scope aquí — solo se sirve dentro de 'home'.
 */
const SCOPE_TO_TYPES: Record<string, string[]> = {
  home: ['case', 'insight', 'tool', 'episode', 'other'],
  work: ['case'],
  insights: ['insight'],
  tools: ['tool'],
  channel: ['episode'],
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
  label: string | null
  alt: string
  queue_order: number
  show_as_carousel: boolean
  autoplay_mode: 'viewport' | 'hover' | null
  pin_media: {
    media_id: string
    slide_order: number
    media_asset: {
      kind: 'image' | 'video'
      cloudinary_public_id: string
    } | null
  }[]
}

const PIN_SELECT = `
  id, ratio, label, alt, queue_order, show_as_carousel, autoplay_mode,
  pin_media (
    media_id,
    slide_order,
    media_asset ( kind, cloudinary_public_id )
  )
`

/**
 * Expande un pin en una o varias "unidades" seleccionables por el motor
 * de feed (especificacion-final-formato-detalle.md §3, §6): un pin con
 * show_as_carousel=true (o con un único medio) es una sola unidad —
 * unitId = pin.id — que lleva todos sus medios para que el cliente
 * pinte un carrusel real. Un pin con show_as_carousel=false y más de un
 * medio se reparte en tantas unidades como medios tenga —
 * unitId = `${pin.id}::${media_id}` — cada una con un único medio, para
 * que el motor de feed (que ya trata cada unidad como un id de texto
 * opaco, domain/types.ts) las seleccione y separe de forma independiente.
 *
 * Pines sin ningún medio listo no producen ninguna unidad (§8.2: "el pin
 * necesita al menos un medio listo").
 */
export function buildFeedUnitsForPin(
  pin: PinRow,
  content: { id: string; type: string; slug: string },
): { unitId: string; entry: PinDirectoryEntry }[] {
  const media = [...pin.pin_media]
    .sort((a, b) => a.slide_order - b.slide_order)
    .filter((pm) => pm.media_asset !== null)
    .map((pm) => ({
      mediaId: pm.media_id,
      kind: pm.media_asset!.kind,
      cloudinaryPublicId: pm.media_asset!.cloudinary_public_id,
    }))

  if (media.length === 0) return []

  const contentType = content.type as PinDirectoryEntry['contentType']

  const base = {
    contentId: content.id,
    contentType,
    contentSlug: content.slug,
    ratio: pin.ratio,
    label: pin.label,
    alt: pin.alt,
    autoplayMode: pin.autoplay_mode,
  }

  if (pin.show_as_carousel || media.length === 1) {
    return [
      {
        unitId: pin.id,
        entry: {
          ...base,
          media: media.map((m) => ({
            kind: m.kind,
            cloudinaryPublicId: m.cloudinaryPublicId,
          })),
        },
      },
    ]
  }

  return media.map((m) => ({
    unitId: `${pin.id}::${m.mediaId}`,
    entry: {
      ...base,
      media: [{ kind: m.kind, cloudinaryPublicId: m.cloudinaryPublicId }],
    },
  }))
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
 * `scope` filtra qué tipos de contenido entran en el universo (ver
 * SCOPE_TO_TYPES) — 'home' por defecto, el feed mixto de siempre. Un
 * scope no reconocido cae también en 'home': createFeedSession.ts ya
 * valida el scope antes de llegar aquí, así que esto es solo defensivo.
 */
export async function getFeedDataset(
  scope: string = 'home',
  client: SupabaseClient = createPublicReadClient(),
): Promise<FeedDataset> {
  const types = SCOPE_TO_TYPES[scope] ?? SCOPE_TO_TYPES.home

  const { data, error } = await client
    .from('content')
    .select(
      `
      id,
      type,
      slug,
      case_detail ( force ),
      pin ( ${PIN_SELECT} )
    `,
    )
    .eq('status', 'published')
    .in('type', types)
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

interface PinLookupRow extends PinRow {
  content: { id: string; type: string; slug: string } | null
}

/**
 * Enriquece una lista de unitIds ya decidida (por ejemplo, una ronda
 * leída de feed_round) sin releer todo el catálogo publicado — a
 * diferencia de getFeedDataset(), que sí necesita el universo completo
 * para generar una ronda nueva. Preserva el orden de `unitIds`, no el
 * que devuelva Supabase.
 *
 * Un unitId es o bien un pin.id (unidad = pin completo, posiblemente con
 * varios medios agrupados en carrusel) o bien `${pin.id}::${media_id}`
 * (unidad = un único medio de un pin con show_as_carousel=false) — el
 * pin subyacente se extrae con el prefijo antes del "::" para poder
 * consultarlo una sola vez por pin, aunque el mismo pin aporte varias
 * unidades a la lista.
 */
export async function getPinDirectoryByIds(
  unitIds: string[],
  client: SupabaseClient = createPublicReadClient(),
): Promise<Record<string, PinDirectoryEntry>> {
  if (unitIds.length === 0) return {}

  const pinIds = [...new Set(unitIds.map((id) => id.split('::')[0]))]

  const { data, error } = await client
    .from('pin')
    .select(
      `
      ${PIN_SELECT},
      content ( id, type, slug )
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
    for (const unit of buildFeedUnitsForPin(pin, pin.content)) {
      directory[unit.unitId] = unit.entry
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
): Promise<FeedConfig> {
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
    ratios: data.ratios,
    mixWindow: data.mix_window,
    distanceWindow: data.distance_window,
    batchSize: data.batch_size,
  }
}
