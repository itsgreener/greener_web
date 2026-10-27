import type { ContentType } from '@/modules/shared/domain/contentType'

import { UnsupportedScopeError } from './feedErrors'
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
/** Los cinco scopes del feed. Cada página pública abre uno de ellos. */
export const FEED_SCOPES = [
  'home',
  'work',
  'insights',
  'tools',
  'channel',
] as const

export type FeedScope = (typeof FEED_SCOPES)[number]

const SCOPE_TO_TYPES: Record<FeedScope, readonly ContentType[]> = {
  home: ['case', 'insight', 'tool', 'episode'],
  work: ['case'],
  insights: ['insight'],
  tools: ['tool'],
  channel: ['episode'],
}

/**
 * Type guard: en las fronteras externas (el cuerpo de la API, una fila de la
 * base de datos) el scope llega como `string`; pasado este filtro ya es un
 * `FeedScope` y el compilador lo propaga.
 */
export function isFeedScope(scope: string): scope is FeedScope {
  return Object.hasOwn(SCOPE_TO_TYPES, scope)
}

/**
 * Convierte un `string` de fuera (una fila de `feed_session`) en `FeedScope`.
 * @throws UnsupportedScopeError si no es uno de los cinco scopes
 */
export function parseFeedScope(scope: string): FeedScope {
  if (!isFeedScope(scope)) throw new UnsupportedScopeError(scope)

  return scope
}

/**
 * Tipos del universo de un scope. Un scope fuera de los cinco ya no cae en
 * 'home' en silencio (mostraba el feed equivocado sin avisar): el tipo
 * `FeedScope` lo impide al compilar y esta guarda falla en ejecución si algo
 * se cuela.
 *
 * @throws UnsupportedScopeError si el scope no existe
 */
export function typesForScope(scope: FeedScope): readonly ContentType[] {
  if (!isFeedScope(scope)) throw new UnsupportedScopeError(scope)

  return SCOPE_TO_TYPES[scope]
}

/** En qué cola del snapshot vive cada tipo de contenido. */
export const CONTENT_TYPE_TO_KIND: Record<ContentType, keyof FeedSnapshot> = {
  case: 'cases',
  insight: 'insights',
  tool: 'tools',
  episode: 'channel',
  other: 'other',
}
