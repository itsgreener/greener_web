import type { ContentStatus } from '@/modules/shared/domain/contentStatus'
import type { ContentType } from '@/modules/shared/domain/contentType'
import type { Locale } from '@/modules/shared/domain/locale'

/** Etiquetas del ABM para los tipos, estados e idiomas de un contenido. */
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

/** Código corto del idioma: ES, EN, CA. */
export function localeCode(locale: Locale): string {
  return locale.toUpperCase()
}
