import { NextResponse, type NextRequest } from 'next/server'

import { getTalentLegacyEnv } from '@/lib/serverEnv'

/**
 * CORS para la WEB ANTIGUA de talent (React, sin servidor), que sigue sirviendo
 * el alta por email y el formulario de los candidatos mientras dure la
 * transición y habla con estas mismas rutas desde otro origen. Transitorio:
 * se retira con ella.
 *
 * Solo cuenta un `Origin` que esté EXACTAMENTE en `TALENT_LEGACY_ALLOWED_ORIGINS`.
 * Sin variable, o con otro origen, todo sigue como antes (solo el propio sitio).
 * No se admiten cookies entre orígenes (no hay `Allow-Credentials`): la clave de
 * acceso es el token del enlace, y los límites cuentan por IP.
 */

/** El origen de la web antigua si la petición viene de uno permitido. */
export function legacyOriginOf(request: NextRequest): string | null {
  const origin = request.headers.get('origin')

  if (!origin) return null

  try {
    return getTalentLegacyEnv().allowedOrigins.includes(origin) ? origin : null
  } catch {
    return null
  }
}

export function legacyCorsHeaders(origin: string): Record<string, string> {
  return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
}

/** Respuesta al preflight del navegador; a un origen no permitido, 403 sin cabeceras. */
export function legacyPreflight(
  request: NextRequest,
  methods: string,
): NextResponse {
  const origin = legacyOriginOf(request)

  if (!origin) return new NextResponse(null, { status: 403 })

  return new NextResponse(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      ...legacyCorsHeaders(origin),
      'Access-Control-Allow-Methods': methods,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    },
  })
}
