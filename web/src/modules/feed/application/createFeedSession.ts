import { createHash } from 'node:crypto'

import { UnsupportedScopeError } from '@/modules/feed/domain/feedErrors'
import type { FeedSessionRepository } from '@/modules/feed/domain/feedPorts'
import { isFeedScope } from '@/modules/feed/domain/feedScope'

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
 *
 * @throws UnsupportedScopeError si el scope no existe
 */
export function makeCreateFeedSession({
  sessions,
}: {
  sessions: Pick<FeedSessionRepository, 'create'>
}) {
  return async function createFeedSession(
    input: CreateFeedSessionInput,
  ): Promise<CreateFeedSessionResult> {
    if (!isFeedScope(input.scope)) {
      throw new UnsupportedScopeError(input.scope)
    }

    const row = await sessions.create({
      scope: input.scope,
      filterHash: hashFilter(input.filter),
      excludeContentId: input.excludeContentId,
    })

    return { sessionId: row.id }
  }
}
