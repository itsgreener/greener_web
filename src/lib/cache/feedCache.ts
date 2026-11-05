import { updateTag } from 'next/cache'

/**
 * Etiqueta de la caché del universo publicado del feed
 * (`modules/feed/infrastructure/cachedFeedCatalog.ts`). Cualquier cambio del
 * ABM que altere lo que ve el feed (publicar, despublicar, pines, títulos,
 * fuerza, programa del episodio, slug) llama a `invalidateFeedCache()` desde
 * su Server Action. Lo programado por cron no pasa por aquí: lo cubre el TTL.
 */
export const FEED_CACHE_TAG = 'feed-dataset'

/** Solo desde Server Actions: caduca la caché ya, para que el admin vea su cambio. */
export function invalidateFeedCache(): void {
  updateTag(FEED_CACHE_TAG)
}
