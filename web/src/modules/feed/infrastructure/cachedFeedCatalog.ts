import { unstable_cache } from 'next/cache'

import { FEED_CACHE_TAG } from '@/lib/cache/feedCache'

import type { FeedCatalog } from '@/modules/feed/domain/feedPorts'
import { excludeContent } from '@/modules/feed/domain/excludeContent'
import {
  getFeedConfig,
  getFeedDataset,
  getFeedInterludes,
  supabaseFeedCatalog,
} from './supabaseFeedSource'

/**
 * Cada ronda nueva de cada visitante leería el catálogo publicado entero.
 * Se cachea por scope y se invalida por etiqueta desde el ABM
 * (`invalidateFeedCache`). El TTL cubre lo que no pasa por una Server
 * Action: la publicación programada (pg_cron) y otro proceso de PM2.
 * La exclusión de la ficha en curso se aplica DESPUÉS, en memoria, para que
 * la entrada de caché sea una por scope y no una por ficha.
 */
export const FEED_DATASET_TTL_SECONDS = 60

const cachedDataset = unstable_cache(
  (scope: string) => getFeedDataset(scope),
  ['feed-dataset'],
  { tags: [FEED_CACHE_TAG], revalidate: FEED_DATASET_TTL_SECONDS },
)

// La configuración se lee en CADA lote (el tamaño del lote está en ella), así
// que también se cachea; el ABM la invalida con la misma etiqueta.
const cachedConfig = unstable_cache(() => getFeedConfig(), ['feed-config'], {
  tags: [FEED_CACHE_TAG],
  revalidate: FEED_DATASET_TTL_SECONDS,
})

// Los `other` publicados, con su frecuencia (se leen en cada lote de la home).
const cachedInterludes = unstable_cache(
  () => getFeedInterludes(),
  ['feed-interludes'],
  { tags: [FEED_CACHE_TAG], revalidate: FEED_DATASET_TTL_SECONDS },
)

export const cachedFeedCatalog: FeedCatalog = {
  ...supabaseFeedCatalog,
  config: () => cachedConfig(),
  interludes: () => cachedInterludes(),
  async dataset(scope, excludeContentId) {
    const dataset = await cachedDataset(scope)

    return excludeContentId
      ? excludeContent(dataset, excludeContentId)
      : dataset
  },
}
