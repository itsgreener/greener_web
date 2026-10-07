import type { SupabaseClient } from '@supabase/supabase-js'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'
import { episodePinSecondaryText } from '@/modules/content/domain/episodeLabels'
import type {
  CaseInput,
  ContentPinQueue,
  FeedConfig,
  FeedSnapshot,
} from '../domain/types'

export interface FeedItemMedia {
  kind: 'image' | 'video'
  cloudinaryPublicId: string
  // Solo vídeo. Decide si se anima en el feed (canAnimateInFeed): por
  // encima de PIN_ANIMATION_LIMITS.maxDurationSeconds solo se enseña el
  // poster. Ausente/null = se desconoce y se trata como animable.
  durationSeconds?: number | null
}

export interface PinDirectoryEntry {
  contentId: string
  contentType: 'case' | 'insight' | 'tool' | 'episode' | 'other'
  contentSlug: string
  ratio: string
  // Other sigue usando el rótulo escrito por el admin.
  // Case/episode/insight derivan sus líneas del propio contenido.
  // Tool reutiliza el rótulo del pin como descripción superior y deriva
  // automáticamente el nombre de la herramienta como segunda línea.
  label: string | null
  // Texto de la primera línea cuando el pin usa formato de dos líneas:
  // título del contenido en Case/Episode/Insight, descripción del pin
  // (pin.label) en Tool.
  displayTitle?: string | null
  // Segunda línea en negrita: cliente en Case, nombre de la Tool en Tool,
  // «programa + tipo» en Episode y el texto fijo INSIGHT_PIN_SECONDARY_TEXT
  // en Insight.
  displaySecondary?: string | null
  alt: string
  // Solo tiene efecto real en un pin de vídeo (§9.1): 'viewport' lo
  // reproduce vía IntersectionObserver (compite por el hueco global del
  // feed, videoPlaybackCoordinator.ts), 'hover' solo mientras el puntero
  // está encima (no compite por el hueco — es una acción explícita del
  // usuario, no reproducción ambiental), null no reproduce nunca.
  autoplayMode: 'viewport' | 'hover' | null
  // Un pin es un único medio (7 oct 2026, §2.41): siempre 1 elemento.
  media: FeedItemMedia[]
}

export interface FeedDataset {
  snapshot: FeedSnapshot
  pinDirectory: Record<string, PinDirectoryEntry>
}

/**
 * Texto en negrita bajo el título en el pin de un insight (2 oct 2026,
 * petición de Greener). Ocupa el lugar que en un caso ocupa el cliente,
 * pero es FIJO: el mismo para todos los insights, sin campo en el ABM.
 * El texto está en inglés porque la interfaz global lo está (§2.4).
 */
export const INSIGHT_PIN_SECONDARY_TEXT = 'Insights by Greener'

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

type ContentTranslationRow = {
  locale: string
  title: string
}

type FeedContentMeta = {
  id: string
  type: string
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

interface ContentRow extends FeedContentMeta {
  default_locale: string
  content_translation: ContentTranslationRow[]
  case_detail: {
    force: number
    client: string | null
  } | null
  episode: {
    program: string | null
    episode_kind: string | null
  } | null
  pin: PinRow[]
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

const PIN_SELECT = `
  id, ratio, label, language, alt, queue_order, autoplay_mode,
  pin_media (
    media_id,
    slide_order,
    media_asset ( kind, cloudinary_public_id, duration_seconds )
  )
`

function resolveContentTitle(
  content: FeedContentMeta,
  pinLanguage: string,
): string | null {
  const translations = content.content_translation ?? []

  return (
    translations.find((translation) => translation.locale === pinLanguage)
      ?.title ??
    translations.find(
      (translation) => translation.locale === content.default_locale,
    )?.title ??
    translations[0]?.title ??
    null
  )
}

function derivedFeedText(
  pin: PinRow,
  content: FeedContentMeta,
): {
  label: string | null
  displayTitle: string | null
  displaySecondary: string | null
} {
  const contentType = content.type as PinDirectoryEntry['contentType']

  if (contentType === 'case') {
    return {
      // Importante: cualquier label antigua guardada por el ABM queda
      // deliberadamente ignorada para case.
      label: null,
      displayTitle: resolveContentTitle(content, pin.language),
      displaySecondary: content.case_detail?.client?.trim() || null,
    }
  }

  if (contentType === 'tool') {
    return {
      // Para Tool mantenemos el texto específico de cada pin que ya existe
      // en `pin.label`, pero deja de renderizarse como rótulo de una sola
      // línea: pasa a ser la descripción superior. La segunda línea es el
      // nombre de la herramienta, obtenido automáticamente del contenido.
      // Así una Tool puede tener muchos pines con descripciones distintas
      // sin duplicar el contenido ni repetir manualmente su nombre.
      label: null,
      displayTitle: pin.label?.trim() || null,
      displaySecondary: resolveContentTitle(content, pin.language),
    }
  }

  if (contentType === 'insight') {
    return {
      // La frase gancho antigua (pin.label) ya no se muestra en insights:
      // el título del insight basta y no se repite texto debajo.
      label: null,
      displayTitle: resolveContentTitle(content, pin.language),
      displaySecondary: INSIGHT_PIN_SECONDARY_TEXT,
    }
  }

  if (contentType === 'episode') {
    return {
      // Mismo criterio para episode: el admin no decide el rótulo del feed.
      label: null,
      displayTitle: resolveContentTitle(content, pin.language),
      // En el formato B final, episode sustituye `client` por el programa
      // + el tipo: «Brand the Future Podcast» (2 oct 2026). El programa es
      // el campo «Programa» del ABM; el tipo, «Tipo de episodio».
      displaySecondary: episodePinSecondaryText(
        content.episode?.program,
        content.episode?.episode_kind,
      ),
    }
  }

  return {
    label: pin.label,
    displayTitle: null,
    displaySecondary: null,
  }
}

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

  const text = derivedFeedText(pin, content)

  return [
    {
      unitId: pin.id,
      entry: {
        contentId: content.id,
        contentType: content.type as PinDirectoryEntry['contentType'],
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
  excludeContentId?: string | null,
  client: SupabaseClient = createPublicReadClient(),
): Promise<FeedDataset> {
  const types = SCOPE_TO_TYPES[scope] ?? SCOPE_TO_TYPES.home

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
    `,
    )
    .eq('status', 'published')
    .in('type', types)

  // Panel de recomendaciones de una página de detalle
  // (especificacion-final-formato-detalle.md §1, §6): el contenido que se
  // está viendo se excluye del universo ANTES de que generateRound lo vea
  // — no filtrando la tanda ya generada, que rompería el tamaño real que
  // espera la virtualización (§10.2).
  if (excludeContentId) {
    query = query.neq('id', excludeContentId)
  }

  const { data, error } = await query.returns<ContentRow[]>()

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
  content: FeedContentMeta | null
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
  client: SupabaseClient = createPublicReadClient(),
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
