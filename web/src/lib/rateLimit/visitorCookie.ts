import { randomUUID } from 'node:crypto'
import type { NextRequest, NextResponse } from 'next/server'

/**
 * Identificador anónimo de "este navegador", usado ÚNICAMENTE para
 * limitar peticiones al feed público (§16.1, PROGRESO §2.16) — un UUID
 * aleatorio, sin ningún dato personal ni relación con ninguna cuenta.
 * No es una cookie de seguimiento: no se lee en ningún otro sitio, no
 * alimenta analítica, no identifica a la misma persona entre sesiones
 * del navegador si borra cookies.
 *
 * Cookie técnica, exenta de consentimiento bajo el art. 22.2 LSSI — la
 * guía de la AEPD pone justo este caso (cookies de seguridad para
 * detectar/limitar abuso) como ejemplo de lo exento. Documentada de
 * todas formas en cookies-inventario.md, porque exenta de consentimiento
 * no significa exenta de mención en la política.
 */
export const VISITOR_COOKIE_NAME = 'greener_visitor'

// 24 h — el mismo TTL que ya usa feed_session (arquitectura §8.5): no
// tiene sentido que el identificador de rate-limit sobreviva más tiempo
// que las sesiones a las que se aplica.
const VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24

export function readVisitorId(request: NextRequest): string | null {
  return request.cookies.get(VISITOR_COOKIE_NAME)?.value ?? null
}

export function getOrCreateVisitorId(request: NextRequest): string {
  return readVisitorId(request) ?? randomUUID()
}

/**
 * Se llama en CADA respuesta de las rutas que usan esto, exista ya la
 * cookie o no: reescribirla con el mismo valor renueva su Max-Age desde
 * la última visita real (ventana de 24h que rueda con el uso), en vez
 * de una fecha de caducidad fija desde la primera vez que se vio a ese
 * visitante.
 */
export function attachVisitorCookie(
  response: NextResponse,
  visitorId: string,
): void {
  response.cookies.set(VISITOR_COOKIE_NAME, visitorId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: VISITOR_COOKIE_MAX_AGE_SECONDS,
  })
}
