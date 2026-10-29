import type { NextRequest } from 'next/server'

import { checkBearerSecret, type BearerAuth } from '@/lib/http/bearerSecret'
import { getCronEnv } from '@/lib/serverEnv'

/**
 * Credencial de las tareas programadas: `Authorization: Bearer <CRON_SECRET>`.
 * Vercel Cron la envía sola cuando existe la variable `CRON_SECRET` en el
 * proyecto; cualquier otro planificador (n8n, `curl` desde un cron) la manda
 * a mano. Sin la variable, o si es demasiado corta, la ruta responde
 * `not_configured` y no hace nada.
 */
export function checkCronAuth(request: NextRequest): BearerAuth {
  let secret: string | undefined

  try {
    secret = getCronEnv().CRON_SECRET
  } catch {
    return 'not_configured'
  }

  return checkBearerSecret(request.headers, secret)
}
