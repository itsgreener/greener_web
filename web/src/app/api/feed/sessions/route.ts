import { NextRequest, NextResponse } from 'next/server'
import {
  createFeedSession,
  UnsupportedScopeError,
} from '@/modules/feed/application/createFeedSession'

/**
 * POST /api/feed/sessions (§16.1): crea una feedSession real, persistida
 * en Supabase (feed_session). Sustituye a /api/feed/demo para todo lo que
 * sea abrir sesión — ese endpoint sigue existiendo como prototipo aislado
 * (Fase 1, Anexo E.2), no se toca aquí.
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de la petición no es JSON válido.' },
      { status: 400 },
    )
  }

  if (typeof body !== 'object' || body === null || !('scope' in body)) {
    return NextResponse.json(
      { error: "Falta 'scope' en el cuerpo de la petición." },
      { status: 400 },
    )
  }

  const { scope, filter } = body as { scope: unknown; filter?: unknown }

  if (typeof scope !== 'string') {
    return NextResponse.json(
      { error: "'scope' debe ser una cadena." },
      { status: 400 },
    )
  }

  const parsedFilter =
    filter && typeof filter === 'object'
      ? (filter as Record<string, string>)
      : undefined

  try {
    const result = await createFeedSession({ scope, filter: parsedFilter })
    return NextResponse.json(result, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    if (error instanceof UnsupportedScopeError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error creando la sesión de feed:', error)
    return NextResponse.json(
      { error: 'No se pudo crear la sesión de feed.' },
      { status: 500 },
    )
  }
}
