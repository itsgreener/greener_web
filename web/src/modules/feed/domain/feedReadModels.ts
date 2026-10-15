import type { ContentType } from '@/modules/shared/domain/contentType'

import type { FeedContentKind, FeedSnapshot } from './types'

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
  contentType: ContentType
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

/** Un pin tal como lo recibe el navegador. */
export interface FeedPinItem {
  pinId: string
  contentId: string
  kind: FeedContentKind
  destination: string
  ratio: string
  label: string | null
  // Case/episode: texto derivado del contenido, no del admin.
  displayTitle?: string | null
  displaySecondary?: string | null
  cta: string | null
  alt: string
  autoplayMode: 'viewport' | 'hover' | null
  media: FeedItemMedia[]
}

/**
 * Aparición de un pin de newsletter (`other` de subtipo newsletter): no tiene
 * medios ni destino, es un formulario. Se identifica por `kind: 'newsletter'`.
 * `pinId` es único por aparición (`newsletter:{contentId}:{n}`) para no
 * repetir la clave en el masonry, que ya incluye el índice de posición.
 */
export interface FeedNewsletterItem {
  kind: 'newsletter'
  pinId: string
  contentId: string
  /** Titular (`content_translation.title`, idioma por defecto). */
  title: string
  /** Texto de apoyo (`content_translation.summary`), si lo hay. */
  text: string | null
}

/**
 * Lo que el feed sirve: un pin o, intercalada por el calendario de
 * interludios (`domain/interludes.ts`), una aparición de newsletter. Las
 * páginas satélite llegan como pines normales (`FeedPinItem`).
 */
export type FeedBatchItem = FeedPinItem | FeedNewsletterItem

export function isNewsletterItem(
  item: FeedBatchItem,
): item is FeedNewsletterItem {
  return item.kind === 'newsletter'
}

export function isPinItem(item: FeedBatchItem): item is FeedPinItem {
  return item.kind !== 'newsletter'
}

/**
 * Un contenido `other` publicado y servible, tal como lo necesita el
 * calendario de interludios. Fuera de la ronda: no pasa por `generateRound`.
 */
export type FeedInterlude =
  | {
      kind: 'newsletter'
      contentId: string
      /** «Una aparición cada N pines». */
      frequency: number
      title: string
      text: string | null
    }
  | {
      kind: 'page'
      contentId: string
      frequency: number
      /** Pines con medio listo, en el orden del ABM; rotan en cada aparición. */
      pins: { pinId: string; entry: PinDirectoryEntry }[]
    }

export interface FeedBatchResult {
  items: FeedBatchItem[]
  cursor: string
  // Índice de la ronda a la que pertenece este lote (§8.5, §16.3). Lo lee
  // el evento «Feed Depth» de analítica (useFeed.ts).
  round: number
  // Tramo dentro de la ronda (0 = primero). Una ronda se sirve en varios
  // lotes de `batchSize` pines; lo lee «Feed Depth».
  batch: number
  // El feed no termina (brief §4.6, arquitectura §8.5): siempre hay más
  // mientras el universo tenga al menos un pin publicado.
  hasMore: boolean
  // Solo en la respuesta de límite de peticiones superado (route handler):
  // lote vacío TEMPORAL, el cliente no debe tratarlo como fin del feed.
  rateLimited?: boolean
}
