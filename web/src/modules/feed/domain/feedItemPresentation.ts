import { feedPinDestination } from '@/modules/content/domain/contentPath'

import type { FeedBatchItem, PinDirectoryEntry } from './feedReadModels'

type ContentType = PinDirectoryEntry['contentType']

// Destino del pin: ver feedPinDestination (contentPath.ts). Los insights
// abren directamente /insights/[slug]/app, sin pasar por su detalle.
function destinationFor(
  contentType: ContentType,
  slug: string,
  unitId: string,
): string {
  const path = feedPinDestination(contentType, slug)

  if (contentType === 'tool') {
    // La ficha de Tool necesita saber desde qué pin se abrió para poder
    // reutilizar exactamente ese medio como miniatura. `unitId` es el id
    // del pin.
    return `${path}?pin=${encodeURIComponent(unitId)}`
  }

  return path
}

function kindFor(contentType: ContentType): string {
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
    case 'other':
      return 'Watch'
  }
}

/** El pin tal como lo recibe el navegador, a partir de su ficha del directorio. */
export function toFeedBatchItem(
  unitId: string,
  meta: PinDirectoryEntry,
): FeedBatchItem {
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
