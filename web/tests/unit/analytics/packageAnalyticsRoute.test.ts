import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}))

vi.mock('@/lib/supabase/publicReadClient', () => ({
  createPublicReadClient: vi.fn(() => ({
    from: mocks.from,
  })),
}))

import { POST } from '@/app/api/analytics/package/route'

const TOOL_ID = '11111111-1111-4111-8111-111111111111'

function createRequest(body: unknown) {
  return new NextRequest('https://example.com/api/analytics/package', {
    method: 'POST',

    headers: {
      'content-type': 'application/json',

      'user-agent': 'Vitest Browser',

      'x-forwarded-for': '203.0.113.10',

      'sec-fetch-site': 'same-origin',
    },

    body: JSON.stringify(body),
  })
}

describe('POST /api/analytics/package', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.from.mockReturnValue({
      select: mocks.select,
    })

    mocks.select.mockReturnValue({
      eq: mocks.eq,
    })

    mocks.eq.mockReturnValue({
      eq: mocks.eq,
      maybeSingle: mocks.maybeSingle,
    })

    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: TOOL_ID,
      },
      error: null,
    })

    vi.stubEnv('NODE_ENV', 'production')

    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_DOMAIN', 'example.com')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{}', {
          status: 202,
        }),
      ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('resuelve el slug al UUID real y envía Tool Used a Plausible', async () => {
    const response = await POST(
      createRequest({
        slug: 'pixel-palette',
        action: 'generate',
      }),
    )

    expect(response.status).toBe(204)

    expect(mocks.from).toHaveBeenCalledWith('content')

    expect(mocks.eq).toHaveBeenCalledWith('type', 'tool')

    expect(mocks.eq).toHaveBeenCalledWith('slug', 'pixel-palette')

    expect(mocks.eq).toHaveBeenCalledWith('status', 'published')

    const fetchMock = vi.mocked(globalThis.fetch)

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('https://plausible.io/api/event')

    const payload = JSON.parse(String(options?.body))

    expect(payload).toEqual({
      name: 'Tool Used',

      domain: 'example.com',

      url: 'https://example.com/tools/pixel-palette/app',

      props: {
        toolId: TOOL_ID,

        action: 'generate',
      },

      interactive: true,
    })

    expect(options?.headers).toMatchObject({
      'Content-Type': 'application/json',

      'User-Agent': 'Vitest Browser',

      'X-Forwarded-For': '203.0.113.10',
    })
  })

  it('rechaza actions inválidas antes de consultar Supabase', async () => {
    const response = await POST(
      createRequest({
        slug: 'pixel-palette',

        action: 'esto tiene espacios',
      }),
    )

    expect(response.status).toBe(400)

    expect(mocks.from).not.toHaveBeenCalled()

    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('no permite registrar una Tool inexistente o no publicada', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const response = await POST(
      createRequest({
        slug: 'pixel-palette',

        action: 'generate',
      }),
    )

    expect(response.status).toBe(404)

    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('en desarrollo no manda eventos a Plausible', async () => {
    vi.stubEnv('NODE_ENV', 'development')

    const response = await POST(
      createRequest({
        slug: 'pixel-palette',

        action: 'generate',
      }),
    )

    expect(response.status).toBe(204)

    expect(mocks.from).not.toHaveBeenCalled()

    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})
