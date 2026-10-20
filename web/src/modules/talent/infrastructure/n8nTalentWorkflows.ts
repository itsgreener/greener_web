import 'server-only'

import { getTalentEnv } from '@/lib/serverEnv'
import { WebhookNotConfiguredError } from '@/modules/talent/domain/talentErrors'
import type { TalentWorkflows } from '@/modules/talent/domain/talentPorts'

/**
 * Tiempo máximo de cada llamada. Los webhooks responden en cuanto reciben la
 * petición (no tienen nodo de respuesta), así que 8 s sobra; sin tope, un n8n
 * caído dejaría colgada la ruta.
 */
export const N8N_TIMEOUT_MS = 8000

/**
 * Llama a un webhook. Un 200 solo significa «recibido»: el resultado del
 * workflow no se puede saber desde aquí (la señal es el `status` de la fila y
 * los correos de error de n8n).
 *
 * La URL del webhook es el único secreto que lo protege hasta que se active la
 * autenticación (fase 4), así que NO se escribe en ningún mensaje de error.
 */
export async function callWebhook(
  url: string,
  body: Record<string, string> | undefined,
): Promise<void> {
  const env = getTalentEnv()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (
    env.TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME &&
    env.TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE
  ) {
    headers[env.TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME] =
      env.TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE
  }

  let response: Response

  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(N8N_TIMEOUT_MS),
    })
  } catch {
    throw new Error(
      'n8n no ha respondido a tiempo o no se ha podido contactar.',
    )
  }

  if (!response.ok) {
    throw new Error(`n8n ha respondido con el estado ${response.status}.`)
  }
}

export const n8nTalentWorkflows: TalentWorkflows = {
  sendFormLink: (accessToken) =>
    callWebhook(getTalentEnv().TALENT_N8N_SEND_LINK_WEBHOOK_URL, {
      access_token: accessToken,
    }),

  processCandidate: (candidateId) =>
    callWebhook(getTalentEnv().TALENT_N8N_PROCESS_FILES_WEBHOOK_URL, {
      candidate_id: candidateId,
    }),

  processPendingCvs: async () => {
    const url = getTalentEnv().TALENT_N8N_PROCESS_CV_WEBHOOK_URL

    if (!url) {
      throw new WebhookNotConfiguredError('TALENT_N8N_PROCESS_CV_WEBHOOK_URL')
    }

    return callWebhook(url, undefined)
  },
}
