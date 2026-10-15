import type { ContentType } from '@/modules/shared/domain/contentType'

import type { FeedSnapshot } from './types'

/**
 * Qué tipos de contenido entran en el universo según el scope de la
 * feedSession (arquitectura §6.1, §8.2). 'home' es el feed mixto de
 * siempre; cada subhome filtra a un único tipo — "el 100% de los
 * contenidos del scope forma el universo", no una mezcla con cuotas.
 * 'other' no entra en el universo de la ronda en ningún scope: se intercala
 * solo en la home, al servir cada lote, según su propio calendario
 * (`interludes.ts`, plan de `other`).
 *
 * scope=related-cases (relacionados dentro de una página de caso) sigue sin
 * implementarse: no hay ninguna pantalla que lo pida.
 */
export const SCOPE_TO_TYPES: Record<string, readonly ContentType[]> = {
  home: ['case', 'insight', 'tool', 'episode'],
  work: ['case'],
  insights: ['insight'],
  tools: ['tool'],
  channel: ['episode'],
}

export function isFeedScope(scope: string): boolean {
  return Object.hasOwn(SCOPE_TO_TYPES, scope)
}

/** Tipos del universo de un scope; un scope desconocido cae en 'home'. */
export function typesForScope(scope: string): readonly ContentType[] {
  return isFeedScope(scope) ? SCOPE_TO_TYPES[scope] : SCOPE_TO_TYPES.home
}

/** En qué cola del snapshot vive cada tipo de contenido. */
export const CONTENT_TYPE_TO_KIND: Record<ContentType, keyof FeedSnapshot> = {
  case: 'cases',
  insight: 'insights',
  tool: 'tools',
  episode: 'channel',
  other: 'other',
}
