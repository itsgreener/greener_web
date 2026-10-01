import { NextRequest, NextResponse } from 'next/server'
import {
  createFeedSession,
  UnsupportedScopeError,
} from '@/modules/feed/application/createFeedSession'
import {
  canCreateSession,
  getLastSession,
  rememberSession,
} from '@/modules/feed/infrastructure/feedRateLimit'
import {
  attachVisitorCookie,
  getOrCreateVisitorId,
} from '@/lib/rateLimit/visitorCookie'

/**
 * POST /api/feed/sessions (§16.1): crea una feedSession real, persistida
 * en Supabase (feed_session). Sustituye a /api/feed/demo para todo lo que
 * sea abrir sesión — ese endpoint sigue existiendo como prototipo aislado
 * (Fase 1, Anexo E.2), no se toca aquí.
 *
 * Límite de peticiones (29 sep, PROGRESO §2.16): 12 creaciones de sesión
 * por minuto y visitante (cookie anónima, `visitorCookie.ts`). Al
 * superarlo, en vez de un error, se devuelve la sesión más reciente de
 * ese visitante — silencioso, sin romper la carga; el efecto secundario
 * asumido es que esa recarga concreta repite la secuencia anterior en
 * vez de una nueva (ver el comentario en feedRateLimit.ts).
 */
export async function POST(request: NextRequest) {
  const visitorId = getOrCreateVisitorId(request)

  // Cada respuesta de esta ruta lleva la cookie de visitante — exista ya
  // o se acabe de generar. Reescribirla con el mismo valor renueva su
  // Max-Age desde esta visita, no la deja caducar desde la primera vez
  // que se vio a este visitante.
  function respond(payload: unknown, init: ResponseInit): NextResponse {
    const response = NextResponse.json(payload, init)
    attachVisitorCookie(response, visitorId)
    return response
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return respond(
      { error: 'Cuerpo de la petición no es JSON válido.' },
      { status: 400 },
    )
  }

  if (typeof body !== 'object' || body === null || !('scope' in body)) {
    return respond(
      { error: "Falta 'scope' en el cuerpo de la petición." },
      { status: 400 },
    )
  }

  const { scope, filter, excludeContentId } = body as {
    scope: unknown
    filter?: unknown
    excludeContentId?: unknown
  }

  if (typeof scope !== 'string') {
    return respond({ error: "'scope' debe ser una cadena." }, { status: 400 })
  }

  if (excludeContentId !== undefined && typeof excludeContentId !== 'string') {
    return respond(
      { error: "'excludeContentId', si se manda, debe ser una cadena." },
      { status: 400 },
    )
  }

  const parsedFilter =
    filter && typeof filter === 'object'
      ? (filter as Record<string, string>)
      : undefined

  if (!canCreateSession(visitorId)) {
    const lastSessionId = getLastSession(visitorId)

    // Con algo que devolver, se devuelve en vez de crear una sesión
    // nueva (§2.16). Sin nada que devolver — un visitante que agota el
    // límite en su primerísima petición, caso límite improbable — no
    // tiene sentido bloquearlo sin ofrecerle nada en su lugar: se deja
    // pasar esta.
    if (lastSessionId) {
      return respond(
        { sessionId: lastSessionId },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      )
    }
  }

  try {
    const result = await createFeedSession({
      scope,
      filter: parsedFilter,
      excludeContentId,
    })
    rememberSession(visitorId, result.sessionId)
    return respond(result, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    if (error instanceof UnsupportedScopeError) {
      return respond({ error: error.message }, { status: 400 })
    }
    console.error('Error creando la sesión de feed:', error)
    return respond(
      { error: 'No se pudo crear la sesión de feed.' },
      { status: 500 },
    )
  }
}
