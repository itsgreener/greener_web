import { NextResponse, type NextRequest } from 'next/server'

import { clientIpFromHeaders, hashClientIp } from '@/lib/http/clientIp'
import { getTalentLegacyEnv } from '@/lib/serverEnv'
import { launchLegacyProcessing } from '@/modules/talent/container'

/**
 * POST /api/talent/process-pending — lanza el procesado de los CVs pendientes
 * a petición de la WEB ANTIGUA de talent (`/private`). Transitoria.
 *
 * Esa web es una SPA que sube los CVs desde el navegador y no puede guardar el
 * secreto de n8n; esta ruta lo guarda por ella. A diferencia del resto de
 * `/api/talent` es de otro origen A PROPÓSITO, así que no usa `rejectCrossSite`
 * y se protege de otra forma:
 *
 * - Solo contesta a los orígenes de `TALENT_LEGACY_ALLOWED_ORIGINS` (CORS y
 *   comprobación de `Origin`).
 * - Exige `Authorization: Bearer <access_token>` de la sesión de Google de
 *   Supabase-talent, y que su correo esté en `TALENT_LEGACY_STAFF_EMAILS`.
 * - Límites por IP y por persona; sin cookie de visitante.
 * - No fuerza el lanzamiento: ver `launchLegacyProcessing`.
 *
 * Sin las dos variables configuradas, responde `not_configured` y no hace nada.
 */

const NO_STORE = { 'Cache-Control': 'no-store' }

type LegacyConfig = { allowedOrigins: string[] }

function readConfig(): LegacyConfig | null {
  try {
    const { allowedOrigins, staffEmails } = getTalentLegacyEnv()

    if (allowedOrigins.length === 0 || staffEmails.length === 0) return null

    return { allowedOrigins }
  } catch {
    return null
  }
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
  }
}

function json(payload: unknown, status: number, origin?: string) {
  return NextResponse.json(payload, {
    status,
    headers: { ...NO_STORE, ...(origin ? corsHeaders(origin) : {}) },
  })
}

function allowedOrigin(request: NextRequest): string | null {
  const config = readConfig()
  const origin = request.headers.get('origin')

  return config && origin && config.allowedOrigins.includes(origin)
    ? origin
    : null
}

/** Preflight: el navegador lo envía antes porque la petición lleva `Authorization`. */
export async function OPTIONS(request: NextRequest) {
  const origin = allowedOrigin(request)

  if (!origin) return new NextResponse(null, { status: 403 })

  return new NextResponse(null, {
    status: 204,
    headers: {
      ...NO_STORE,
      ...corsHeaders(origin),
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Authorization',
      'Access-Control-Max-Age': '600',
    },
  })
}

export async function POST(request: NextRequest) {
  if (!readConfig()) return json({ error: 'not_configured' }, 503)

  const origin = allowedOrigin(request)

  if (!origin) return json({ error: 'forbidden' }, 403)

  const match = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')

  if (!match) return json({ error: 'unauthorized' }, 401, origin)

  const result = await launchLegacyProcessing({
    accessToken: match[1],
    ipKey: hashClientIp(clientIpFromHeaders(request.headers)),
  })

  switch (result.status) {
    case 'unauthorized':
      return json({ error: 'unauthorized' }, 401, origin)
    case 'forbidden':
      return json({ error: 'forbidden' }, 403, origin)
    case 'rate_limited':
      return json({ error: 'rate_limited' }, 429, origin)
    case 'not_configured':
    case 'unavailable':
      return json({ error: result.status }, 503, origin)
    case 'busy':
      return json(
        { ok: true, status: 'busy', reason: result.reason },
        200,
        origin,
      )
    default:
      return json({ ok: true, status: result.status }, 200, origin)
  }
}
