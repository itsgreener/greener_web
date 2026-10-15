import { NextRequest, NextResponse } from 'next/server'
import { feedLimits, getFeedSessionBatch } from '@/modules/feed/container'
import {
  FeedSessionNotFoundError,
  InvalidFeedCursorError,
} from '@/modules/feed/domain/feedErrors'
import {
  attachVisitorCookie,
  getOrCreateVisitorId,
} from '@/lib/rateLimit/visitorCookie'
import { isUuid } from '@/lib/validation/uuid'
import { NEWSLETTER_COOKIE_NAME } from '@/modules/newsletter/domain/newsletterCookie'

/**
 * GET /api/feed/{sessionId}?cursor=...&size=... (§16.1): siguiente lote real
 * de una sesión de feed ya abierta con POST /api/feed/sessions. `cursor`
 * ausente = primer lote (ronda 0). `size` (opcional) pide un lote más
 * pequeño que `feed_config.batch_size` (móvil: 20); nunca más grande.
 *
 * La cookie `greener_newsletter` (dispositivo ya suscrito) decide si el lote
 * lleva apariciones del pin de newsletter; el calendario de interludios vive
 * en el caso de uso (plan de `other`, §4).
 *
 * Límite de peticiones: 50 lotes por minuto y visitante (el scroll rápido los
 * dispara y el primero de cada ronda la genera entera, §8; por eso más margen
 * que POST /api/feed/sessions, 12/min).
 *
 * Al superarlo se responde sin pines pero con `rateLimited: true` y SIN
 * `hasMore: false`: un lote vacío de verdad es un corte permanente (el
 * universo del scope está vacío), un límite es temporal. FeedProvider los
 * distingue y, con `rateLimited`, no se rinde: reintenta en el siguiente
 * scroll (PROGRESO §2.19).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const cursor = request.nextUrl.searchParams.get('cursor')
  const sizeParam = request.nextUrl.searchParams.get('size')
  // Valor no numérico = sin petición: se usa el tamaño configurado.
  const size =
    sizeParam !== null && /^\d{1,4}$/.test(sizeParam) ? Number(sizeParam) : null
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

  if (!feedLimits.canFetchBatch(visitorId)) {
    return respond(
      {
        items: [],
        cursor: cursor ?? '',
        round: 0,
        batch: 0,
        // Honesto: SÍ hay más (§8.5, "el feed no termina"), solo que no
        // ahora mismo. `rateLimited` es la señal real para el cliente.
        hasMore: true,
        rateLimited: true,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const batch = await getFeedSessionBatch(sessionId, cursor, size, {
      newsletterSubscribed:
        request.cookies.get(NEWSLETTER_COOKIE_NAME)?.value === '1',
    })
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
