import { readFileSync } from 'node:fs'

import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sweep = vi.hoisted(() => vi.fn())

vi.mock('@/modules/packages/container', () => ({
  sweepStagedUploads: sweep,
}))

const SECRET = 'a'.repeat(40)

function request(authorization?: string) {
  return new NextRequest('https://itsgreener.com/api/cron/cleanup-staging', {
    method: 'GET',
    headers: authorization ? { authorization } : {},
  })
}

async function route() {
  vi.resetModules()

  return import('@/app/api/cron/cleanup-staging/route')
}

beforeEach(() => {
  sweep.mockReset()
  sweep.mockResolvedValue({
    scanned: 3,
    deleted: 2,
    failed: 0,
    truncated: false,
  })
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('GET /api/cron/cleanup-staging', () => {
  it('sin CRON_SECRET está cerrada: 503 not_configured y no hace nada', async () => {
    vi.stubEnv('CRON_SECRET', '')
    const { GET } = await route()

    const response = await GET(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'not_configured' })
    expect(sweep).not.toHaveBeenCalled()
  })

  it('un CRON_SECRET demasiado corto también la cierra', async () => {
    vi.stubEnv('CRON_SECRET', 'corto')
    const { GET } = await route()

    expect((await GET(request('Bearer corto'))).status).toBe(503)
    expect(sweep).not.toHaveBeenCalled()
  })

  it.each([undefined, 'Bearer otra-cosa', `Basic ${SECRET}`, SECRET])(
    'credencial incorrecta (%j): 401 con WWW-Authenticate y sin limpiar',
    async (header) => {
      vi.stubEnv('CRON_SECRET', SECRET)
      const { GET } = await route()

      const response = await GET(request(header))

      expect(response.status).toBe(401)
      expect(response.headers.get('WWW-Authenticate')).toBe('Bearer')
      expect(sweep).not.toHaveBeenCalled()
    },
  )

  it('con la credencial correcta limpia y devuelve el recuento', async () => {
    vi.stubEnv('CRON_SECRET', SECRET)
    const { GET } = await route()

    const response = await GET(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({
      ok: true,
      scanned: 3,
      deleted: 2,
      failed: 0,
      truncated: false,
    })
    expect(sweep).toHaveBeenCalledTimes(1)
  })

  it('si la limpieza falla responde 503 sin filtrar el detalle', async () => {
    vi.stubEnv('CRON_SECRET', SECRET)
    sweep.mockRejectedValueOnce(new Error('relation storage.objects secreta'))
    const { GET } = await route()

    const response = await GET(request(`Bearer ${SECRET}`))
    const text = await response.text()

    expect(response.status).toBe(503)
    expect(JSON.parse(text)).toEqual({ error: 'unavailable' })
    expect(text).not.toMatch(/storage|secreta/)
  })

  it('solo expone GET (Vercel Cron llama por GET) y no se cachea', async () => {
    const mod = await route()

    expect(mod).toHaveProperty('GET')
    expect(mod).not.toHaveProperty('POST')
    expect(mod.dynamic).toBe('force-dynamic')
  })
})

describe('vercel.json', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
    crons: { path: string; schedule: string }[]
  }

  it('programa la limpieza una vez por semana', () => {
    expect(config.crons).toEqual([
      { path: '/api/cron/cleanup-staging', schedule: '0 4 * * 0' },
    ])
  })

  it('cada ruta programada existe', () => {
    for (const { path } of config.crons) {
      expect(() =>
        readFileSync(`src/app${path}/route.ts`, 'utf8'),
      ).not.toThrow()
    }
  })
})
