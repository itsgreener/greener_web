import type { ContentType } from '@/modules/shared/domain/contentType'

/**
 * Tipos de paquete HTML y el contenido al que pertenece cada uno:
 *
 * - `tool`    → contenido `tool`, servido en `/tools/[slug]/app`.
 * - `insight` → contenido `insight`, en `/insights/[slug]/app`.
 * - `variety` → contenido `other` de subtipo página satélite, en
 *   `/variety/[slug]/app` (plan de `other`, fase 4).
 *
 * El nombre del tipo de paquete no coincide con el del contenido en el último
 * caso, de ahí la tabla.
 */
export const PACKAGE_KINDS = ['tool', 'insight', 'variety'] as const

export type PackageKind = (typeof PACKAGE_KINDS)[number]

export const PACKAGE_KIND_CONTENT_TYPE: Record<PackageKind, ContentType> = {
  tool: 'tool',
  insight: 'insight',
  variety: 'other',
}
