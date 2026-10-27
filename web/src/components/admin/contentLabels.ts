import type { ContentStatus } from '@/modules/shared/domain/contentStatus'
import type { ContentType } from '@/modules/shared/domain/contentType'

/**
 * Etiquetas del ABM para los tipos y estados de un contenido. Las de idioma
 * (`localeLabel`, `localeCode`) viven en `modules/shared/domain/locale`, junto
 * al esquema, porque también las usa la web pública.
 */
const TYPE_LABELS: Record<ContentType, string> = {
  case: 'Case',
  insight: 'Insight',
  tool: 'Tool',
  episode: 'Episode',
  other: 'Other',
}

const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: 'Borrador',
  scheduled: 'Programado',
  published: 'Publicado',
}

export function contentTypeLabel(type: ContentType): string {
  return TYPE_LABELS[type]
}

export function contentStatusLabel(status: ContentStatus): string {
  return STATUS_LABELS[status]
}
