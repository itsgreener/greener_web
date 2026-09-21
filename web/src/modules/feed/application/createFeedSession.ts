import { createHash } from 'node:crypto'
import {
  createFeedSessionRow,
  type FeedSessionRow,
} from '../infrastructure/feedSessionRepository'

export interface CreateFeedSessionInput {
  scope: string
  filter?: Record<string, string>
  /**
   * Panel de recomendaciones de una página de detalle
   * (especificacion-final-formato-detalle.md §1, §6): el contenido que se
   * está viendo no debe poder recomendarse a sí mismo. Opcional — toda
   * sesión de home/subhome de verdad no lo usa.
   */
  excludeContentId?: string
}

export interface CreateFeedSessionResult {
  sessionId: string
}

// Arquitectura Anexo E.4 / §8.2: 'home' es el feed mixto; cada subhome
// filtra a un único tipo de contenido ("el 100% de los contenidos del
// scope forma el universo"). scope=related-cases (relacionados dentro de
// una página de caso) sigue sin implementarse — no hace falta todavía,
// no hay ninguna pantalla que lo pida.
const SUPPORTED_SCOPES = new Set([
  'home',
  'work',
  'insights',
  'tools',
  'channel',
])

export class UnsupportedScopeError extends Error {
  constructor(scope: string) {
    super(
      `El scope '${scope}' todavía no está soportado (solo 'home' por ahora).`,
    )
    this.name = 'UnsupportedScopeError'
  }
}

function hashFilter(filter: Record<string, string> | undefined): string | null {
  if (!filter || Object.keys(filter).length === 0) return null
  const sorted = Object.keys(filter)
    .sort()
    .map((k) => `${k}=${filter[k]}`)
    .join('&')
  return createHash('sha256').update(sorted).digest('hex')
}

/**
 * Caso de uso: "abre una feedSession para esta seed y este scope"
 * (arquitectura §6.1). No genera ninguna tanda todavía — eso lo hace
 * getFeedSessionBatch en la primera petición de lote.
 */
export async function createFeedSession(
  input: CreateFeedSessionInput,
  createRow: (params: {
    scope: string
    filterHash: string | null
    excludeContentId?: string | null
  }) => Promise<FeedSessionRow> = createFeedSessionRow,
): Promise<CreateFeedSessionResult> {
  if (!SUPPORTED_SCOPES.has(input.scope)) {
    throw new UnsupportedScopeError(input.scope)
  }

  const row = await createRow({
    scope: input.scope,
    filterHash: hashFilter(input.filter),
    excludeContentId: input.excludeContentId,
  })
  return { sessionId: row.id }
}
