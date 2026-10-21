import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const SECRET = 'purga-secreta-de-prueba-con-32-caracteres!'
const A = '0b1f1a52-3b8e-4a0e-9c1d-5d4e6f7a8b9c'

const container = vi.hoisted(() => ({
  purgeExpiredCandidates: { list: vi.fn(), purge: vi.fn() },
}))
const env = vi.hoisted(() => ({
  get: vi.fn<() => { TALENT_PURGE_SECRET?: string }>(),
}))

vi.mock('@/modules/talent/container', () => ({
  ...container,
  PURGE_MAX_BATCH: 50,
}))
vi.mock('@/lib/serverEnv', () => ({ getTalentEnv: () => env.get() }))

const { POST } = await import('@/app/api/talent/purge/route')

function call(
  body: unknown,
  headers: Record<string, string> = { authorization: `Bearer ${SECRET}` },
) {
  return POST(
    new NextRequest('http://localhost:3000/api/talent/purge', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  env.get.mockReturnValue({ TALENT_PURGE_SECRET: SECRET })
  container.purgeExpiredCandidates.list.mockResolvedValue({
    expired: [{ id: A, bucketFiles: 1, externalLinks: ['https://d/x'] }],
    more: false,
  })
  container.purgeExpiredCandidates.purge.mockResolvedValue([
    {
      status: 'deleted',
      id: A,
      bucketFiles: 1,
      externalLinks: ['https://d/x'],
    },
  ])
})

describe('POST /api/talent/purge · acceso', () => {
  it('sin secreto configurado, cerrada (503) y no toca nada', async () => {
    env.get.mockReturnValue({})

    const response = await call({ mode: 'list' })

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'not_configured' })
    expect(container.purgeExpiredCandidates.list).not.toHaveBeenCalled()
  })

  it('si el entorno de talent no es válido, también cerrada', async () => {
    env.get.mockImplementation(() => {
      throw new Error('env')
    })

    expect((await call({ mode: 'list' })).status).toBe(503)
  })

  it.each([
    ['sin cabecera', {}],
    ['esquema distinto', { authorization: `Basic ${SECRET}` }],
    ['secreto equivocado', { authorization: 'Bearer otro' }],
    ['secreto con un carácter de más', { authorization: `Bearer ${SECRET}x` }],
  ])('%s → 401', async (_name, headers) => {
    const response = await call({ mode: 'list' }, headers)

    expect(response.status).toBe(401)
    expect(response.headers.get('www-authenticate')).toBe('Bearer')
    expect(container.purgeExpiredCandidates.list).not.toHaveBeenCalled()
    expect(container.purgeExpiredCandidates.purge).not.toHaveBeenCalled()
  })

  it('no pone cookie y no se cachea', async () => {
    const response = await call({ mode: 'list' })

    expect(response.headers.get('set-cookie')).toBeNull()
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})

describe('POST /api/talent/purge · modos', () => {
  it('list devuelve los caducados', async () => {
    const response = await call({ mode: 'list', limit: 5 })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      expired: [{ id: A, bucketFiles: 1, externalLinks: ['https://d/x'] }],
      more: false,
    })
    expect(container.purgeExpiredCandidates.list).toHaveBeenCalledWith(5)
  })

  it('list sin límite usa el máximo', async () => {
    await call({ mode: 'list' })

    expect(container.purgeExpiredCandidates.list).toHaveBeenCalledWith(50)
  })

  it('delete devuelve solo id y estado (sin enlaces)', async () => {
    const response = await call({ mode: 'delete', ids: [A] })

    expect(await response.json()).toEqual({
      ok: true,
      results: [{ id: A, status: 'deleted' }],
    })
    expect(container.purgeExpiredCandidates.purge).toHaveBeenCalledWith([A])
  })

  it.each([
    ['modo desconocido', { mode: 'nuke' }],
    ['sin modo', {}],
    ['delete sin ids', { mode: 'delete', ids: [] }],
    ['ids que no son uuid', { mode: 'delete', ids: ['1 or 1=1'] }],
    ['más de 50 ids', { mode: 'delete', ids: Array(51).fill(A) }],
    ['límite fuera de rango', { mode: 'list', limit: 500 }],
  ])('%s → 400', async (_name, body) => {
    expect((await call(body)).status).toBe(400)
    expect(container.purgeExpiredCandidates.purge).not.toHaveBeenCalled()
  })

  it('un cuerpo que no es JSON → 400', async () => {
    expect((await call('{no')).status).toBe(400)
  })

  it('si el caso de uso lanza, 503 sin detalles', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    container.purgeExpiredCandidates.list.mockRejectedValue(new Error('db'))

    const response = await call({ mode: 'list' })

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'unavailable' })
  })
})
