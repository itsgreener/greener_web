import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGIN = 'https://talent.itsgreener.com'
const TOKEN = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
const BASE = 'http://localhost:3000'

const container = vi.hoisted(() => ({
  registerCandidate: vi.fn(),
  getCandidateForm: vi.fn(),
  saveCandidateForm: vi.fn(),
  uploadCandidateFile: vi.fn(),
  deleteCandidateFile: vi.fn(),
}))

vi.mock('@/modules/talent/container', () => container)

const params = { params: Promise.resolve({ token: TOKEN }) }

async function routes() {
  vi.resetModules()

  return {
    candidates: await import('@/app/api/talent/candidates/route'),
    form: await import('@/app/api/talent/form/[token]/route'),
    files: await import('@/app/api/talent/form/[token]/files/route'),
  }
}

function request(
  path: string,
  {
    method = 'GET',
    headers = {},
  }: { method?: string; headers?: Record<string, string> } = {},
) {
  return new NextRequest(`${BASE}${path}`, {
    method,
    headers,
    body: method === 'PUT' || method === 'POST' ? '{}' : undefined,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('TALENT_LEGACY_ALLOWED_ORIGINS', ORIGIN)
  vi.stubEnv('TALENT_LEGACY_STAFF_EMAILS', 'ana@itsgreener.com')
  container.getCandidateForm.mockResolvedValue({
    ok: true,
    form: { email: 'a@b.co' },
  })
  container.registerCandidate.mockResolvedValue({ ok: true })
  container.saveCandidateForm.mockResolvedValue({ ok: true })
  container.deleteCandidateFile.mockResolvedValue({ ok: true })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('web antigua de talent · formulario', () => {
  it('GET del origen permitido: pasa aunque sea del mismo sitio (sec-fetch-site) y lleva CORS', async () => {
    const { form } = await routes()
    const response = await form.GET(
      request(`/api/talent/form/${TOKEN}`, {
        headers: { origin: ORIGIN, 'sec-fetch-site': 'same-site' },
      }),
      params,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe(ORIGIN)
    expect(response.headers.get('vary')).toContain('Origin')
    expect(response.headers.get('access-control-allow-credentials')).toBeNull()
    expect(container.getCandidateForm).toHaveBeenCalledOnce()
  })

  it('PUT, POST de fichero, DELETE de fichero y alta por email también pasan', async () => {
    const { form, files, candidates } = await routes()
    const headers = {
      origin: ORIGIN,
      'sec-fetch-site': 'cross-site',
      'content-type': 'application/json',
    }

    const put = await form.PUT(
      request(`/api/talent/form/${TOKEN}`, { method: 'PUT', headers }),
      params,
    )
    const del = await files.DELETE(
      request(
        `/api/talent/form/${TOKEN}/files?fileId=99999999-9999-4999-8999-999999999999`,
        { method: 'DELETE', headers },
      ),
      params,
    )
    const signup = await candidates.POST(
      request('/api/talent/candidates', { method: 'POST', headers }),
    )

    for (const response of [put, del, signup]) {
      expect(response.status).toBe(200)
      expect(response.headers.get('access-control-allow-origin')).toBe(ORIGIN)
    }
  })

  it('un origen que no está en la lista sigue bloqueado (403) y sin CORS', async () => {
    const { form } = await routes()
    const response = await form.GET(
      request(`/api/talent/form/${TOKEN}`, {
        headers: {
          origin: 'https://otra.example',
          'sec-fetch-site': 'cross-site',
        },
      }),
      params,
    )

    expect(response.status).toBe(403)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
    expect(container.getCandidateForm).not.toHaveBeenCalled()
  })

  it('sin la variable, el origen de la web antigua no tiene ningún trato especial', async () => {
    vi.stubEnv('TALENT_LEGACY_ALLOWED_ORIGINS', '')
    vi.stubEnv('TALENT_LEGACY_STAFF_EMAILS', '')
    const { form } = await routes()
    const response = await form.GET(
      request(`/api/talent/form/${TOKEN}`, {
        headers: { origin: ORIGIN, 'sec-fetch-site': 'cross-site' },
      }),
      params,
    )

    expect(response.status).toBe(403)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('las peticiones del propio sitio no cambian: sin cabeceras CORS', async () => {
    const { form } = await routes()
    const response = await form.GET(
      request(`/api/talent/form/${TOKEN}`, {
        headers: { 'sec-fetch-site': 'same-origin' },
      }),
      params,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })
})

describe('web antigua de talent · preflight', () => {
  it.each([
    ['candidates', 'POST', '/api/talent/candidates'],
    ['form', 'GET, PUT', `/api/talent/form/${TOKEN}`],
    ['files', 'POST, DELETE', `/api/talent/form/${TOKEN}/files`],
  ] as const)(
    '%s: al origen permitido le dice los métodos y las cabeceras',
    async (name, methods, path) => {
      const all = await routes()
      const response = all[name].OPTIONS(
        request(path, { method: 'OPTIONS', headers: { origin: ORIGIN } }),
      )

      expect(response.status).toBe(204)
      expect(response.headers.get('access-control-allow-origin')).toBe(ORIGIN)
      expect(response.headers.get('access-control-allow-methods')).toBe(methods)
      expect(response.headers.get('access-control-allow-headers')).toBe(
        'Content-Type',
      )
    },
  )

  it('a otro origen no le concede nada', async () => {
    const { form } = await routes()
    const response = form.OPTIONS(
      request(`/api/talent/form/${TOKEN}`, {
        method: 'OPTIONS',
        headers: { origin: 'https://otra.example' },
      }),
    )

    expect(response.status).toBe(403)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })
})
