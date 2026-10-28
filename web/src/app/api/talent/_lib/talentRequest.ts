import { NextResponse, type NextRequest } from 'next/server'

import { readBodyWithLimit } from '@/app/api/talent/_lib/boundedBody'
import { clientIpFromHeaders, hashClientIp } from '@/lib/http/clientIp'
import {
  attachVisitorCookie,
  getOrCreateVisitorId,
} from '@/lib/rateLimit/visitorCookie'
import { TALENT_TEXT_LIMITS } from '@/modules/talent/domain/talentConstants'
import type {
  FileRejection,
  TalentFailure,
  TalentRequestContext,
} from '@/modules/talent/application/talentResults'

/**
 * Piezas comunes de las rutas `/api/talent`. Todas hablan JSON (salvo la
 * subida de ficheros), solo contestan al propio sitio y llevan la cookie
 * técnica de visitante, la misma que ya usa el feed para limitar peticiones.
 *
 * Los errores son códigos (`error: 'rate_limited'`…) y no frases: el paquete
 * `variety` tiene el texto en es/ca/en y elige el suyo.
 */

const STATUS_BY_FAILURE = {
  invalid: 400,
  rate_limited: 429,
  not_found: 404,
  email_taken: 409,
  unavailable: 503,
} as const

const STATUS_BY_REJECTION: Record<FileRejection, number> = {
  file_empty: 400,
  file_too_large: 413,
  file_type: 415,
  too_many_files: 409,
  file_scan: 422,
}

export type TalentRequest = {
  context: TalentRequestContext
  respond: (payload: unknown, init?: ResponseInit) => NextResponse
}

/** Contexto de límites + respuestas que llevan la cookie de visitante. */
export function talentRequest(request: NextRequest): TalentRequest {
  const visitorId = getOrCreateVisitorId(request)

  return {
    context: {
      visitorKey: visitorId,
      ipKey: hashClientIp(clientIpFromHeaders(request.headers)),
    },
    respond(payload, init = {}) {
      const response = NextResponse.json(payload, {
        ...init,
        headers: { 'Cache-Control': 'no-store', ...init.headers },
      })

      attachVisitorCookie(response, visitorId)

      return response
    },
  }
}

/**
 * Solo peticiones del propio sitio. `sec-fetch-site` lo manda todo navegador y
 * no lo puede falsear una página ajena; sin la cabecera (un script, no un
 * navegador) la petición sigue, y la frenan los límites.
 */
export function rejectCrossSite(
  request: NextRequest,
  { respond }: TalentRequest,
): NextResponse | null {
  const site = request.headers.get('sec-fetch-site')

  if (site && site !== 'same-origin') {
    return respond({ error: 'forbidden' }, { status: 403 })
  }

  return null
}

type JsonBody =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: NextResponse }

/** Cuerpo JSON de tamaño acotado. Un array o un valor suelto se rechazan. */
export async function readJsonBody(
  request: NextRequest,
  { respond }: TalentRequest,
): Promise<JsonBody> {
  const contentType = request.headers.get('content-type') ?? ''

  if (!contentType.toLowerCase().includes('application/json')) {
    return {
      ok: false,
      response: respond({ error: 'unsupported_media_type' }, { status: 415 }),
    }
  }

  const declared = Number(request.headers.get('content-length') ?? 0)

  if (declared > TALENT_TEXT_LIMITS.maxJsonBodyBytes) {
    return {
      ok: false,
      response: respond({ error: 'too_large' }, { status: 413 }),
    }
  }

  // Tope en BYTES y con el cuerpo cortado al pasarlo, no después de leerlo
  // entero (SEC-PUB-C1): `Content-Length` puede faltar o mentir.
  const read = await readBodyWithLimit(
    request,
    TALENT_TEXT_LIMITS.maxJsonBodyBytes,
  )

  if (!read.ok) {
    return {
      ok: false,
      response: respond({ error: 'too_large' }, { status: 413 }),
    }
  }

  const text = new TextDecoder().decode(read.bytes)

  try {
    const body: unknown = JSON.parse(text)

    if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
      return { ok: true, body: body as Record<string, unknown> }
    }
  } catch {
    // cae en el rechazo de abajo
  }

  return {
    ok: false,
    response: respond({ error: 'invalid_json' }, { status: 400 }),
  }
}

/** Campo trampa: un visitante real no lo ve y no lo rellena. */
export function honeypotOf(body: Record<string, unknown>): string {
  return typeof body.website === 'string' ? body.website : ''
}

/** Traduce un fallo de un caso de uso a su respuesta HTTP. */
export function failureResponse(
  failure: TalentFailure,
  { respond }: TalentRequest,
): NextResponse {
  if (failure.reason === 'file_rejected') {
    return respond(
      { error: failure.rejection },
      { status: STATUS_BY_REJECTION[failure.rejection] },
    )
  }

  if (failure.reason === 'invalid') {
    return respond(
      { error: 'invalid', fieldErrors: failure.fieldErrors },
      { status: STATUS_BY_FAILURE.invalid },
    )
  }

  return respond(
    { error: failure.reason },
    { status: STATUS_BY_FAILURE[failure.reason] },
  )
}
