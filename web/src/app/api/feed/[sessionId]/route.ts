import { NextRequest, NextResponse } from 'next/server'
import {
  getFeedSessionBatch,
  FeedSessionNotFoundError,
  InvalidFeedCursorError,
} from '@/modules/feed/application/getFeedSessionBatch'
import { canFetchBatch } from '@/modules/feed/infrastructure/feedRateLimit'
import {
  attachVisitorCookie,
  getOrCreateVisitorId,
} from '@/lib/rateLimit/visitorCookie'
import { isUuid } from '@/lib/validation/uuid'

/**
 * GET /api/feed/{sessionId}?cursor=... (§16.1): siguiente lote real de
 * una sesión de feed ya abierta con POST /api/feed/sessions. `cursor`
 * ausente = primer lote (ronda 0).
 *
 * Límite de peticiones (29 sep, PROGRESO §2.16): 50 lotes por minuto y
 * visitante — cada lote genera una ronda completa (§8), más caro que
 * crear la sesión, pero también lo que dispara el scroll rápido, así
 * que necesita más margen que POST /api/feed/sessions (12/min).
 *
 * Bug real encontrado y corregido el 30 sep (rompía el scroll de la
 * home — PROGRESO §2.19): al superarlo, esta ruta respondía sin pines y
 * con `hasMore: false`, pensando que reutilizaba el comportamiento de
 * "sección sin contenido todavía" que ya existía en el cliente
 * (`appendBatch`, FeedProvider.tsx). Pero ese comportamiento existente
 * es un corte PERMANENTE (si una subhome no tiene nada publicado,
 * generateRound es determinista y todas las rondas futuras también
 * vendrán vacías — no tiene sentido seguir pidiendo). Un límite de
 * peticiones no es eso: es temporal, el minuto siguiente ya hay cupo de
 * nuevo. Al devolver `hasMore: false` aquí, la home (que necesita más
 * rondas que tools/insights para llenar la pantalla, porque mezcla
 * tipos por cuota en vez de servir un único tipo denso) podía agotar el
 * cupo durante la carga automática inicial — sobre todo recargando
 * varias veces seguidas en poco tiempo, como al probar contenido — y se
 * quedaba con el scroll roto para el resto de esa carga del documento:
 * el sentinel de IntersectionObserver solo reacciona a un CAMBIO de
 * intersección, así que sin un scroll manual que lo recoloque, nunca
 * reintentaba por su cuenta.
 *
 * Ahora se marca con `rateLimited: true`, que FeedProvider.tsx sabe
 * distinguir de un lote vacío de verdad: no toca `hasMore`, así que el
 * siguiente intento (el próximo scroll, o el propio prefetch si hay
 * ocasión) vuelve a probar con normalidad en vez de rendirse para
 * siempre.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const cursor = request.nextUrl.searchParams.get('cursor')
  const visitorId = getOrCreateVisitorId(request)

  function respond(payload: unknown, init: ResponseInit): NextResponse {
    const response = NextResponse.json(payload, init)
    attachVisitorCookie(response, visitorId)
    return response
  }

  // Un id que no es uuid no puede ser una sesión: 404 directo, sin que
  // Postgres lo rechace con un error que acabaría en 500 (auditoría 8 oct).
  if (!isUuid(sessionId)) {
    return respond({ error: 'La sesión de feed no existe.' }, { status: 404 })
  }

  if (!canFetchBatch(visitorId)) {
    return respond(
      {
        items: [],
        cursor: cursor ?? '',
        round: 0,
        // Honesto: SÍ hay más (§8.5, "el feed no termina"), solo que no
        // ahora mismo. `rateLimited` es la señal real para el cliente.
        hasMore: true,
        rateLimited: true,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const batch = await getFeedSessionBatch(sessionId, cursor)
    return respond(batch, {
      // El orden depende de la seed de sesión — igual que en el prototipo
      // demo, nunca cacheable entre sesiones (§6.1).
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    if (error instanceof FeedSessionNotFoundError) {
      return respond({ error: error.message }, { status: 404 })
    }
    if (error instanceof InvalidFeedCursorError) {
      return respond({ error: error.message }, { status: 400 })
    }
    console.error('Error sirviendo el lote del feed:', error)
    return respond(
      { error: 'No se pudo servir el lote del feed.' },
      { status: 500 },
    )
  }
}
