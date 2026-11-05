import type { FeedDataset } from './feedReadModels'
import type { FeedSnapshot } from './types'

/**
 * Quita un contenido del universo del feed ANTES de generar la ronda (panel
 * de recomendaciones de una ficha: no se recomienda a sí misma). No filtra
 * una tanda ya generada, que rompería el tamaño real que espera la
 * virtualización. Pura: no muta el dataset de entrada (puede venir de caché).
 */
export function excludeContent(
  dataset: FeedDataset,
  contentId: string,
): FeedDataset {
  const keep = <T extends { contentId: string }>(list: T[]): T[] =>
    list.filter((item) => item.contentId !== contentId)

  const snapshot: FeedSnapshot = {
    cases: keep(dataset.snapshot.cases),
    insights: keep(dataset.snapshot.insights),
    tools: keep(dataset.snapshot.tools),
    channel: keep(dataset.snapshot.channel),
    other: keep(dataset.snapshot.other),
  }

  const pinDirectory = Object.fromEntries(
    Object.entries(dataset.pinDirectory).filter(
      ([, entry]) => entry.contentId !== contentId,
    ),
  )

  return { snapshot, pinDirectory }
}
