import { describe, it, expect, vi, beforeEach } from 'vitest'

let getClaims: ReturnType<typeof vi.fn>
let rpc: ReturnType<typeof vi.fn>

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getClaims },
    rpc,
  })),
}))

vi.mock('@/modules/media/infrastructure/cloudinaryServer', () => ({
  createSignedImageUpload: vi.fn(() => ({
    timestamp: 123,
    signature: 'sig',
    folder: 'greener/content',
    apiKey: 'key',
    cloudName: 'test-cloud',
  })),
  createSignedVideoUpload: vi.fn(() => ({
    timestamp: 123,
    signature: 'sig',
    folder: 'greener/content/videos',
    apiKey: 'key',
    cloudName: 'test-cloud',
  })),
}))

beforeEach(() => {
  getClaims = vi.fn().mockResolvedValue({
    data: { claims: { email: 'a@itsgreener.com' } },
    error: null,
  })
  rpc = vi.fn().mockResolvedValue({ data: true, error: null })
})

describe.each([
  {
    name: 'sign (imagen)',
    routeModule: '@/app/api/admin/media/sign/route',
  },
  {
    name: 'sign-video (vídeo)',
    routeModule: '@/app/api/admin/media/sign-video/route',
  },
])('POST /api/admin/media/$name', ({ routeModule }) => {
  it('sin sesión válida, devuelve 401', async () => {
    const { POST } = await import(routeModule)

    getClaims.mockResolvedValue({ data: null, error: new Error('no session') })

    const response = await POST()

    expect(response.status).toBe(401)
  })

  it('con sesión pero dominio no autorizado, devuelve 403', async () => {
    const { POST } = await import(routeModule)

    rpc.mockResolvedValue({ data: false, error: null })

    const response = await POST()

    expect(response.status).toBe(403)
  })

  it('con sesión y dominio autorizado, devuelve la firma', async () => {
    const { POST } = await import(routeModule)

    const response = await POST()

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.signature).toBe('sig')
    expect(body.cloudName).toBe('test-cloud')
  })
})
