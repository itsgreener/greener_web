import { createHash, timingSafeEqual } from 'node:crypto'

import type { NextRequest } from 'next/server'

import { getTalentEnv } from '@/lib/serverEnv'

export type PurgeAuth = 'ok' | 'not_configured' | 'unauthorized'

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

/**
 * Credencial de la purga: `Authorization: Bearer <TALENT_PURGE_SECRET>`.
 * Se comparan los hashes (mismo largo siempre) con `timingSafeEqual`, de modo
 * que ni el contenido ni la longitud del secreto se filtran por el tiempo de
 * respuesta. Sin el secreto configurado la ruta queda cerrada del todo.
 */
export function checkPurgeAuth(request: NextRequest): PurgeAuth {
  let secret: string | undefined

  try {
    secret = getTalentEnv().TALENT_PURGE_SECRET
  } catch {
    return 'not_configured'
  }

  if (!secret) return 'not_configured'

  const header = request.headers.get('authorization') ?? ''
  const match = /^Bearer (.+)$/.exec(header)

  if (!match) return 'unauthorized'

  return timingSafeEqual(digest(match[1]), digest(secret))
    ? 'ok'
    : 'unauthorized'
}
