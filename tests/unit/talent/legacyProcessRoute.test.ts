import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGIN = 'https://talent.itsgreener.com'
const URL = 'http://localhost:3000/api/talent/process-pending'

const container = vi.hoisted(() => ({ launchLegacyProcessing: vi.fn() }))
const env = vi.hoisted(() => ({
  get: vi.fn<() => { allowedOrigins: string[]; staffEmails: string[] }>(),
}))

vi.mock('@/modules/talent/container', () => container)
vi.mock('@/lib/serverEnv', () => ({
  getTalentLegacyEnv: () => env.get(),
  getIpHashEnv: () => ({ CONTACT_IP_HASH_SALT: 'sal-de-prueba' }),
}))

const { POST, OPTIONS } = await import('@/app/api/talent/process-pending/route')

function post(headers: Record<string, string> = {}) {
  return POST(
    new NextRequest(URL, {
      method: 'POST',
      headers: {
        origin: ORIGIN,
        authorization: 'Bearer jwt-de-prueba',
        ...headers,
      },
    }),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  env.get.mockReturnValue({
    allowedOrigins: [ORIGIN],
    staffEmails: ['ana@itsgreener.com'],
  })
  container.launchLegacyProcessing.mockResolvedValue({
    status: 'triggered',
    pending: 2,
  })
})

describe('POST /api/talent/process-pending · acceso', () => {
  it.each([
    ['sin variables', { allowedOrigins: [], staffEmails: [] }],
    ['sin correos', { allowedOrigins: [ORIGIN], staffEmails: [] }],
  ])('%s: cerrada (503) y no toca nada', async (_name, value) => {
    env.get.mockReturnValue(value)

    const response = await post()

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'not_configured' })
    expect(container.launchLegacyProcessing).not.toHaveBeenCalled()
  })

  it('si el entorno no es válido, también cerrada', async () => {
    env.get.mockImplementation(() => {
      throw new Error('env')
    })

    expect((await post()).status).toBe(503)
  })

  it.each([
    ['otro origen', { origin: 'https://otra.example' }],
    ['sin origen', { origin: '' }],
  ])('%s → 403 sin cabeceras CORS', async (_name, headers) => {
    const response = await post(headers)

    expect(response.status).toBe(403)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
    expect(container.launchLegacyProcessing).not.toHaveBeenCalled()
  })

  it.each([
    ['sin cabecera', { authorization: '' }],
    ['esquema distinto', { authorization: 'Basic abc' }],
  ])('%s → 401', async (_name, headers) => {
    const response = await post(headers)

    expect(response.status).toBe(401)
    expect(response.headers.get('access-control-allow-origin')).toBe(ORIGIN)
    expect(container.launchLegacyProcessing).not.toHaveBeenCalled()
  })
})

describe('POST /api/talent/process-pending · respuesta', () => {
  it('pasa el token y la IP hasheada al caso de uso', async () => {
    const response = await post({ 'x-forwarded-for': '203.0.113.7' })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, status: 'triggered' })

    const [call] = container.launchLegacyProcessing.mock.calls[0]

    expect(call.accessToken).toBe('jwt-de-prueba')
    expect(call.ipKey).toMatch(/^[0-9a-f]{64}$/)
    expect(call.ipKey).not.toContain('203.0.113.7')
  })

  it('lleva CORS solo para el origen permitido, no se cachea y no pone cookie', async () => {
    const response = await post()

    expect(response.headers.get('access-control-allow-origin')).toBe(ORIGIN)
    expect(response.headers.get('vary')).toBe('Origin')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it.each([
    [{ status: 'unauthorized' }, 401, { error: 'unauthorized' }],
    [{ status: 'forbidden' }, 403, { error: 'forbidden' }],
    [{ status: 'rate_limited' }, 429, { error: 'rate_limited' }],
    [{ status: 'not_configured' }, 503, { error: 'not_configured' }],
    [{ status: 'unavailable' }, 503, { error: 'unavailable' }],
    [
      { status: 'nothing_pending' },
      200,
      { ok: true, status: 'nothing_pending' },
    ],
    [
      { status: 'busy', reason: 'in_progress', pending: 4 },
      200,
      { ok: true, status: 'busy', reason: 'in_progress' },
    ],
  ])('traduce %j', async (result, status, body) => {
    container.launchLegacyProcessing.mockResolvedValue(result)

    const response = await post()

    expect(response.status).toBe(status)
    expect(await response.json()).toEqual(body)
  })
})

describe('OPTIONS /api/talent/process-pending (preflight)', () => {
  function preflight(origin: string) {
    return OPTIONS(
      new NextRequest(URL, { method: 'OPTIONS', headers: { origin } }),
    )
  }

  it('al origen permitido le dice qué puede enviar', async () => {
    const response = await preflight(ORIGIN)

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe(ORIGIN)
    expect(response.headers.get('access-control-allow-methods')).toBe('POST')
    expect(response.headers.get('access-control-allow-headers')).toBe(
      'Authorization',
    )
  })

  it('a otro origen no le concede nada', async () => {
    const response = await preflight('https://otra.example')

    expect(response.status).toBe(403)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('sin configuración no concede nada', async () => {
    env.get.mockReturnValue({ allowedOrigins: [], staffEmails: [] })

    expect((await preflight(ORIGIN)).status).toBe(403)
  })
})
