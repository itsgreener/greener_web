import { publicContentPath } from '@/modules/content/domain/contentPath'

import type { FeedPinItem, PinDirectoryEntry } from './feedReadModels'
import type { FeedContentKind } from './types'

type ContentType = PinDirectoryEntry['contentType']

// Destino del pin: la ruta pública del contenido (contentPath.ts). Los
// insights y las páginas satélite (`other`) abren directamente su paquete
// (/insights/[slug]/app, /variety/[slug]/app), sin pasar por una ficha.
function destinationFor(
  contentType: ContentType,
  slug: string,
  unitId: string,
): string {
  const path = publicContentPath(contentType, slug)

  if (contentType === 'tool') {
    // La ficha de Tool necesita saber desde qué pin se abrió para poder
    // reutilizar exactamente ese medio como miniatura. `unitId` es el id
    // del pin.
    return `${path}?pin=${encodeURIComponent(unitId)}`
  }

  return path
}

function kindFor(contentType: ContentType): FeedContentKind {
  return contentType === 'episode' ? 'channel' : contentType
}

// especificacion-final-formato-detalle.md §1: el CTA del pin en el feed
// es fijo por tipo de contenido, no un texto libre por pin — pin.cta
// desaparece del modelo (§3, "Pin (todos los tipos)" ya no lo lista).
function ctaFor(contentType: ContentType): string | null {
  switch (contentType) {
    case 'tool':
      return 'Use'
    case 'insight':
      return 'Read'
    case 'case':
    case 'episode':
      return 'Watch'
    case 'other':
      return 'Open'
  }
}

/** El pin tal como lo recibe el navegador, a partir de su ficha del directorio. */
export function toFeedBatchItem(
  unitId: string,
  meta: PinDirectoryEntry,
): FeedPinItem {
  return {
    pinId: unitId,
    contentId: meta.contentId,
    kind: kindFor(meta.contentType),
    destination: destinationFor(meta.contentType, meta.contentSlug, unitId),
    ratio: meta.ratio,
    label: meta.label,
    displayTitle: meta.displayTitle ?? null,
    displaySecondary: meta.displaySecondary ?? null,
    cta: ctaFor(meta.contentType),
    alt: meta.alt,
    autoplayMode: meta.autoplayMode,
    media: meta.media,
  }
}
