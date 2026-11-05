import { updateTag } from 'next/cache'

/**
 * Etiqueta de la caché de «qué versión está publicada» de cada tool/insight
 * (`modules/packages/infrastructure/supabaseStorageSource.ts`). Se invalida
 * desde las Server Actions que publican, despublican, hacen rollback o
 * borran versiones; el TTL cubre la publicación programada y otros procesos.
 */
export const PACKAGE_CACHE_TAG = 'published-package-version'

/** Solo desde Server Actions. */
export function invalidatePackageCache(): void {
  updateTag(PACKAGE_CACHE_TAG)
}
