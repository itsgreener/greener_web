import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import {
  PURGE_MAX_BATCH,
  purgeExpiredCandidates,
} from '@/modules/talent/container'

import { checkPurgeAuth } from '@/app/api/talent/_lib/purgeAuth'
import { readJsonBody } from '@/app/api/talent/_lib/talentRequest'

/**
 * POST /api/talent/purge — purga por plazo de conservación (2 años desde el
 * alta; ver `talentRetention.ts`). La llama el flujo programado de n8n, no un
 * navegador: va con `Authorization: Bearer <TALENT_PURGE_SECRET>` y no lleva
 * cookie de visitante ni comprobación de sitio.
 *
 * Dos modos, para que n8n borre lo de Drive ANTES de que se pierda el enlace:
 *
 * - `{ "mode": "list", "limit"?: 1..50 }` → `{ ok, expired: [{ id, bucketFiles,
 *   externalLinks }], more }`. No borra nada.
 * - `{ "mode": "delete", "ids": [uuid…] }` (hasta 50) → `{ ok, results: [{ id,
 *   status }] }`. Cada id se vuelve a comprobar: solo se borra si ha caducado.
 *   `status`: `deleted` | `not_expired` | `not_found` | `error`. Repetirlo es
 *   seguro.
 */
const Body = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('list'),
    limit: z.number().int().min(1).max(PURGE_MAX_BATCH).optional(),
  }),
  z.object({
    mode: z.literal('delete'),
    ids: z.array(z.uuid()).min(1).max(PURGE_MAX_BATCH),
  }),
])

function respond(payload: unknown, init: ResponseInit = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...init.headers },
  })
}

export async function POST(request: NextRequest) {
  const auth = checkPurgeAuth(request)

  if (auth === 'not_configured') {
    return respond({ error: 'not_configured' }, { status: 503 })
  }

  if (auth === 'unauthorized') {
    return respond(
      { error: 'unauthorized' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } },
    )
  }

  const parsed = await readJsonBody(request, {
    context: { visitorKey: 'purge', ipKey: 'purge' },
    respond: (payload, init) => respond(payload, init) as NextResponse,
  })

  if (!parsed.ok) return parsed.response

  const body = Body.safeParse(parsed.body)

  if (!body.success) return respond({ error: 'invalid' }, { status: 400 })

  try {
    if (body.data.mode === 'list') {
      const { expired, more } = await purgeExpiredCandidates.list(
        body.data.limit ?? PURGE_MAX_BATCH,
      )

      return respond({ ok: true, expired, more })
    }

    const outcomes = await purgeExpiredCandidates.purge(body.data.ids)

    return respond({
      ok: true,
      results: outcomes.map(({ id, status }) => ({ id, status })),
    })
  } catch (error) {
    console.error('Talent: fallo en la purga', error)

    return respond({ error: 'unavailable' }, { status: 503 })
  }
}
