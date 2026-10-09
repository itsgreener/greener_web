import { describe, it, expect, vi, beforeEach } from 'vitest'

let exchangeCodeForSession: ReturnType<typeof vi.fn>

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: exchangeCodeForSession,
    },
  })),
}))

beforeEach(() => {
  exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null })
})

describe('GET /auth/callback', () => {
  it('con code válido y sin next, redirige a /admin por defecto', async () => {
    const { GET } = await import('@/app/auth/callback/route')

    const response = await GET(
      new Request('http://localhost:3000/auth/callback?code=abc123'),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/admin')
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123')
  })

  it('con code válido y next relativo, redirige a next', async () => {
    const { GET } = await import('@/app/auth/callback/route')

    const response = await GET(
      new Request(
        'http://localhost:3000/auth/callback?code=abc123&next=/admin/contents',
      ),
    )

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/admin/contents',
    )
  })

  it('con next absoluto a otro origen, lo ignora y usa /admin — protección open-redirect', async () => {
    const { GET } = await import('@/app/auth/callback/route')

    const response = await GET(
      new Request(
        'http://localhost:3000/auth/callback?code=abc123&next=https://evil.example.com/phishing',
      ),
    )

    expect(response.headers.get('location')).toBe('http://localhost:3000/admin')
  })

  it('con next protocol-relative (//evil.com), lo descarta y vuelve a /admin', async () => {
    const { GET } = await import('@/app/auth/callback/route')

    const response = await GET(
      new Request(
        'http://localhost:3000/auth/callback?code=abc123&next=//evil.example.com',
      ),
    )

    // Antes se aceptaba porque `${origin}${next}` mantenía el host; desde la
    // auditoría del 8 oct la base puede ser NEXT_PUBLIC_SITE_URL y se
    // prefiere no depender de cómo se concatena: un "//" nunca es un path
    // interno legítimo.
    expect(response.headers.get('location')).toBe('http://localhost:3000/admin')
  })

  it('sin code, redirige a /admin/login?error=oauth', async () => {
    const { GET } = await import('@/app/auth/callback/route')

    const response = await GET(
      new Request('http://localhost:3000/auth/callback'),
    )

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/admin/login?error=oauth',
    )
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('si exchangeCodeForSession falla, redirige a /admin/login?error=oauth', async () => {
    const { GET } = await import('@/app/auth/callback/route')

    exchangeCodeForSession.mockResolvedValue({
      error: new Error('invalid code'),
    })

    const response = await GET(
      new Request('http://localhost:3000/auth/callback?code=malo'),
    )

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/admin/login?error=oauth',
    )
  })
})
