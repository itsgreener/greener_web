import { getPinsInRange, type FeedConfig } from '@/modules/feed/domain'
import { getDemoSnapshot } from '@/modules/feed/infrastructure/demoSnapshotSource'

export interface FeedBatchItem {
  pinId: string
  contentId: string
  kind: string
  destination: string
  ratio: string
  label: string
  cta: string | null
  alt: string
  cloudinaryPublicId: string
  relaxationLevel: number
}

export interface FeedBatchResult {
  items: FeedBatchItem[]
  nextOffset: number
  hasMore: boolean
}

// Ratios provisionales (ADR-11 pendiente de confirmar — Anexo A del
// documento de arquitectura). Mismos valores que feed_config por defecto.
const DEMO_CONFIG: FeedConfig = {
  ratios: { cases: 70, insights: 15, tools: 5, channel: 5, other: 5 },
  mixWindow: 20,
  distanceWindow: 10,
}

function destinationFor(contentType: 'case' | 'episode', slug: string): string {
  return contentType === 'case' ? `/work/${slug}` : `/channel/${slug}`
}

/**
 * Caso de uso: "dame el lote de pines [offset, offset+count) del feed
 * demo para esta seed". Orquesta domain/infrastructure sin conocer ni
 * Next.js ni cómo se sirve por HTTP — eso lo hace el route handler
 * (arquitectura §24.4).
 */
export async function getDemoFeedBatch(
  seed: string,
  offset: number,
  count: number,
): Promise<FeedBatchResult> {
  const { snapshot, pinDirectory } = await getDemoSnapshot()

  const { items } = getPinsInRange(snapshot, DEMO_CONFIG, seed, offset, count)

  const enriched: FeedBatchItem[] = items.map((pin) => {
    const meta = pinDirectory[pin.pinId]
    if (!meta) {
      throw new Error(
        `Pin ${pin.pinId} no tiene entrada en pinDirectory — dataset inconsistente.`,
      )
    }
    return {
      pinId: pin.pinId,
      contentId: pin.contentId,
      kind: pin.kind,
      destination: destinationFor(meta.contentType, meta.contentSlug),
      ratio: meta.ratio,
      label: meta.label,
      cta: meta.cta,
      alt: meta.alt,
      cloudinaryPublicId: meta.cloudinaryPublicId,
      relaxationLevel: pin.relaxationLevel,
    }
  })

  return {
    items: enriched,
    nextOffset: offset + enriched.length,
    // El feed demo nunca "se acaba" (brief §4.6): siempre hay más mientras
    // el universo tenga al menos un pin. getPinsInRange ya lo garantiza
    // devolviendo menos ítems solo si el universo está vacío.
    hasMore: enriched.length === count,
  }
}
