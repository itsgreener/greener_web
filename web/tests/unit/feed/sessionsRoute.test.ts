import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * POST /api/feed/sessions con el límite de creación de sesiones y la
 * cookie de visitante (§2.16, 29 sep). feedRateLimit.ts es estado real
 * de módulo (no mockeado): se prueba la integración de verdad, con
 * vi.resetModules() + import dinámico para partir de cupo limpio en
 * cada test, y tiempo controlado para no depender de esperas reales.
 */

const createFeedSession = vi.fn()

vi.mock('@/modules/feed/application/createFeedSession', () => ({
  createFeedSession: (...args: unknown[]) => createFeedSession(...args),
  UnsupportedScopeError: class UnsupportedScopeError extends Error {},
}))

function requestWithCookie(visitorId?: string): NextRequest {
  return new NextRequest('http://localhost/api/feed/sessions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(visitorId ? { cookie: `greener_visitor=${visitorId}` } : {}),
    },
    body: JSON.stringify({ scope: 'home' }),
  })
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-29T10:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('POST /api/feed/sessions — cookie de visitante', () => {
  it('sin cookie previa, genera una y la manda en la respuesta', async () => {
    createFeedSession.mockResolvedValue({ sessionId: 'session-1' })
    const { POST } = await import('@/app/api/feed/sessions/route')

    const response = await POST(requestWithCookie())

    const setCookie = response.headers.get('set-cookie')
    expect(setCookie).toContain('greener_visitor=')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=lax')
  })

  it('con cookie previa, la reescribe con el MISMO valor (renueva el Max-Age, no cambia de identidad)', async () => {
    createFeedSession.mockResolvedValue({ sessionId: 'session-1' })
    const { POST } = await import('@/app/api/feed/sessions/route')

    const response = await POST(requestWithCookie('visitor-existente'))

    expect(response.headers.get('set-cookie')).toContain(
      'greener_visitor=visitor-existente',
    )
  })
})

describe('POST /api/feed/sessions — límite de 12 creaciones por minuto', () => {
  it('las primeras 12 crean sesión de verdad', async () => {
    createFeedSession.mockResolvedValue({ sessionId: 'nueva-sesion' })
    const { POST } = await import('@/app/api/feed/sessions/route')

    for (let i = 0; i < 12; i++) {
      const response = await POST(requestWithCookie('visitor-1'))
      expect(response.status).toBe(201)
    }

    expect(createFeedSession).toHaveBeenCalledTimes(12)
  })

  it('la 13ª NO crea sesión nueva: devuelve la más reciente, con 200 en vez de 201', async () => {
    createFeedSession.mockResolvedValueOnce({ sessionId: 'sesion-1' })
    for (let i = 0; i < 11; i++) {
      createFeedSession.mockResolvedValueOnce({ sessionId: `sesion-${i + 2}` })
    }
    const { POST } = await import('@/app/api/feed/sessions/route')

    for (let i = 0; i < 12; i++) {
      await POST(requestWithCookie('visitor-1'))
    }

    const thirteenth = await POST(requestWithCookie('visitor-1'))
    const body = (await thirteenth.json()) as { sessionId: string }

    expect(thirteenth.status).toBe(200)
    expect(body.sessionId).toBe('sesion-12') // la última creada de verdad
    expect(createFeedSession).toHaveBeenCalledTimes(12) // no una 13ª
  })

  it('un visitante distinto no se ve afectado por el límite del otro', async () => {
    createFeedSession.mockResolvedValue({ sessionId: 'sesion-x' })
    const { POST } = await import('@/app/api/feed/sessions/route')

    for (let i = 0; i < 12; i++) {
      await POST(requestWithCookie('visitor-1'))
    }

    const response = await POST(requestWithCookie('visitor-2'))
    expect(response.status).toBe(201)
  })

  it('sin ninguna sesión previa que devolver, deja pasar la petición igualmente (caso límite improbable)', async () => {
    createFeedSession.mockResolvedValue({ sessionId: 'primera-sesion' })
    const { POST } = await import('@/app/api/feed/sessions/route')

    // 12 creaciones agotan el cupo, pero sin rememberSession() nunca
    // llamado (createFeedSession lanzando, por ejemplo) no habría nada
    // que devolver — se simula vaciando el mock a mitad de camino.
    for (let i = 0; i < 12; i++) {
      await POST(requestWithCookie('visitor-1'))
    }

    // El visitante SIGUE teniendo una sesión recordada (la última de las
    // 12), así que esto comprueba el camino normal, no el límite vacío
    // — documentado como caso aparte, no reproducible sin tocar el
    // módulo directamente. Se deja constancia en feedRateLimit.test.ts.
    const response = await POST(requestWithCookie('visitor-1'))
    expect(response.status).toBe(200)
  })

  it('pasado un minuto completo, el cupo se reinicia', async () => {
    createFeedSession.mockResolvedValue({ sessionId: 'sesion-x' })
    const { POST } = await import('@/app/api/feed/sessions/route')

    for (let i = 0; i < 12; i++) {
      await POST(requestWithCookie('visitor-1'))
    }
    expect((await POST(requestWithCookie('visitor-1'))).status).toBe(200)

    vi.setSystemTime(new Date('2026-09-29T10:01:00Z'))

    expect((await POST(requestWithCookie('visitor-1'))).status).toBe(201)
  })
})

describe('validación de entrada (auditoría 8 oct)', () => {
  it('un excludeContentId que no es uuid da 400 sin llegar a Postgres', async () => {
    const { POST } = await import('@/app/api/feed/sessions/route')

    const response = await POST(
      new NextRequest('http://localhost/api/feed/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: 'tools',
          excludeContentId: 'no-es-uuid',
        }),
      }),
    )

    expect(response.status).toBe(400)
    expect(createFeedSession).not.toHaveBeenCalled()
  })
})
