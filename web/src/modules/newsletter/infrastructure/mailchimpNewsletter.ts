import { createHash } from 'node:crypto'
import { getMailchimpEnv } from '@/lib/serverEnv'

type MailchimpMemberStatus =
  'subscribed' | 'unsubscribed' | 'cleaned' | 'pending' | 'transactional'

type MailchimpMember = {
  email_address?: string
  status?: MailchimpMemberStatus
}

type MailchimpError = {
  title?: string
  detail?: string
  status?: number
}

/**
 * Tiempo máximo de cada llamada a Mailchimp. Sin él, una API caída o lenta
 * dejaría colgada la acción del formulario (y la conexión del servidor) hasta
 * que el sistema operativo cortara. 8 s sobra para la API normal.
 */
export const MAILCHIMP_TIMEOUT_MS = 8000

export type MailchimpSubscribeResult =
  | { status: 'confirmation_sent' }
  | { status: 'already_subscribed' }
  | { status: 'confirmation_pending' }

function apiUrl(path: string) {
  return `https://${getMailchimpEnv().MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0${path}`
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getMailchimpEnv().MAILCHIMP_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

function subscriberHash(email: string) {
  return createHash('md5').update(email.trim().toLowerCase()).digest('hex')
}

/** `fetch` con tiempo máximo; los fallos de red y de tiempo se traducen a un error propio. */
async function mailchimpFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(MAILCHIMP_TIMEOUT_MS),
    })
  } catch (error) {
    const name = error instanceof Error ? error.name : ''

    if (name === 'TimeoutError' || name === 'AbortError') {
      console.error('Mailchimp request timed out', {
        url: new URL(url).pathname,
      })
      throw new Error('Mailchimp did not respond in time.')
    }

    console.error('Mailchimp request failed', error)
    throw new Error('Mailchimp could not be reached.')
  }
}

async function parseMailchimpError(
  response: Response,
): Promise<MailchimpError> {
  try {
    return (await response.json()) as MailchimpError
  } catch {
    return { status: response.status, title: response.statusText }
  }
}

/**
 * Alta real contra el Audience existente de Mailchimp.
 *
 * - Nuevo email -> status=pending, para que Mailchimp envíe el email de
 *   confirmación (double opt-in).
 * - Ya subscribed -> no se modifica nada.
 * - Ya pending -> no se duplica el contacto.
 * - Unsubscribed/transactional -> vuelve a pending para exigir confirmación.
 * - Cleaned -> no se fuerza el alta: Mailchimp lo marcó como dirección no
 *   entregable y se devuelve error controlado.
 */
export async function subscribeEmailInMailchimp(
  email: string,
): Promise<MailchimpSubscribeResult> {
  const normalizedEmail = email.trim().toLowerCase()
  const hash = subscriberHash(normalizedEmail)
  const memberPath = `/lists/${encodeURIComponent(
    getMailchimpEnv().MAILCHIMP_AUDIENCE_ID,
  )}/members/${hash}`

  const existingResponse = await mailchimpFetch(apiUrl(memberPath), {
    method: 'GET',
    headers: authHeaders(),
    cache: 'no-store',
  })

  if (existingResponse.ok) {
    const existing = (await existingResponse.json()) as MailchimpMember

    if (existing.status === 'subscribed') {
      return { status: 'already_subscribed' }
    }

    if (existing.status === 'pending') {
      return { status: 'confirmation_pending' }
    }

    if (existing.status === 'cleaned') {
      throw new Error(
        'This email cannot be subscribed because Mailchimp marked it as undeliverable.',
      )
    }

    const updateResponse = await mailchimpFetch(apiUrl(memberPath), {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: 'pending' }),
      cache: 'no-store',
    })

    if (!updateResponse.ok) {
      const error = await parseMailchimpError(updateResponse)
      console.error('Mailchimp update member failed', {
        status: updateResponse.status,
        title: error.title,
        detail: error.detail,
      })
      throw new Error('Mailchimp could not start the confirmation process.')
    }

    return { status: 'confirmation_sent' }
  }

  // 404 = no existe todavía en este Audience. Cualquier otro código es un
  // error real de autenticación/configuración/API y no se oculta.
  if (existingResponse.status !== 404) {
    const error = await parseMailchimpError(existingResponse)
    console.error('Mailchimp get member failed', {
      status: existingResponse.status,
      title: error.title,
      detail: error.detail,
    })
    throw new Error('Mailchimp could not check this subscriber.')
  }

  const createResponse = await mailchimpFetch(
    apiUrl(
      `/lists/${encodeURIComponent(getMailchimpEnv().MAILCHIMP_AUDIENCE_ID)}/members`,
    ),
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        email_address: normalizedEmail,
        status: 'pending',
        tags: ['Greener Website'],
      }),
      cache: 'no-store',
    },
  )

  if (!createResponse.ok) {
    const error = await parseMailchimpError(createResponse)
    console.error('Mailchimp create member failed', {
      status: createResponse.status,
      title: error.title,
      detail: error.detail,
    })
    throw new Error('Mailchimp could not start the confirmation process.')
  }

  return { status: 'confirmation_sent' }
}
