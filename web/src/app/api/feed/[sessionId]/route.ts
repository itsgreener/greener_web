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

/**
 * GET /api/feed/{sessionId}?cursor=... (§16.1): siguiente lote real de
 * una sesión de feed ya abierta con POST /api/feed/sessions. `cursor`
 * ausente = primer lote (ronda 0).
 *
 * Límite de peticiones (29 sep, PROGRESO §2.16): 50 lotes por minuto y
 * visitante — cada lote genera una ronda completa (§8), más caro que
 * crear la sesión, pero también lo que dispara el scroll rápido, así
 * que necesita más margen que POST /api/feed/sessions (12/min). Al
 * superarlo, se responde como si el catálogo se hubiera agotado
 * (`hasMore: false`, sin pines): el cliente ya sabe dejar de pedir más
 * ante eso (useFeed.ts), sin ningún error visible — reutiliza un
 * comportamiento que ya existía, no añade ninguno nuevo.
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

  if (!canFetchBatch(visitorId)) {
    return respond(
      { items: [], cursor: cursor ?? '', round: 0, hasMore: false },
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
