import { createHash } from 'node:crypto'
import {
  createFeedSessionRow,
  type FeedSessionRow,
} from '../infrastructure/feedSessionRepository'

export interface CreateFeedSessionInput {
  scope: string
  filter?: Record<string, string>
}

export interface CreateFeedSessionResult {
  sessionId: string
}

// MVP: solo "home" (arquitectura Anexo E.4 — subhomes y scope=related-cases
// llegan en la Fase 3, cuando haga falta filtrar el universo por etiqueta).
const SUPPORTED_SCOPES = new Set(['home'])

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
  }) => Promise<FeedSessionRow> = createFeedSessionRow,
): Promise<CreateFeedSessionResult> {
  if (!SUPPORTED_SCOPES.has(input.scope)) {
    throw new UnsupportedScopeError(input.scope)
  }

  const row = await createRow({
    scope: input.scope,
    filterHash: hashFilter(input.filter),
  })
  return { sessionId: row.id }
}
