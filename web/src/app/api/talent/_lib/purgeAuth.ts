import type { NextRequest } from 'next/server'

import { checkBearerSecret, type BearerAuth } from '@/lib/http/bearerSecret'
import { getTalentPurgeEnv } from '@/lib/serverEnv'

export type PurgeAuth = BearerAuth

/**
 * Credencial de la purga: `Authorization: Bearer <TALENT_PURGE_SECRET>`
 * (comparación en tiempo constante en `checkBearerSecret`). Sin el secreto
 * configurado, o con uno inválido, la ruta queda cerrada del todo.
 */
export function checkPurgeAuth(request: NextRequest): PurgeAuth {
  let secret: string | undefined

  try {
    secret = getTalentPurgeEnv().TALENT_PURGE_SECRET
  } catch {
    return 'not_configured'
  }

  return checkBearerSecret(request.headers, secret)
}
