import { beforeEach, describe, expect, it, vi } from 'vitest'

let getClaims: ReturnType<typeof vi.fn>
let rpc: ReturnType<typeof vi.fn>

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims }, rpc })),
}))

const { getAdminActor } = await import('@/lib/auth/adminSession')

beforeEach(() => {
  getClaims = vi.fn().mockResolvedValue({
    data: { claims: { email: 'ana@itsgreener.com' } },
    error: null,
  })
  rpc = vi.fn().mockResolvedValue({ data: true, error: null })
})

describe('getAdminActor', () => {
  it('con sesión de admin devuelve su email', async () => {
    expect(await getAdminActor()).toEqual({ email: 'ana@itsgreener.com' })
  })

  it('sin sesión devuelve null', async () => {
    getClaims.mockResolvedValue({ data: null, error: { message: 'no' } })

    expect(await getAdminActor()).toBeNull()
  })

  it('con sesión pero sin ser admin devuelve null', async () => {
    rpc.mockResolvedValue({ data: false, error: null })

    expect(await getAdminActor()).toBeNull()
  })

  it('un admin sin email en la sesión no sirve para anotar la actividad', async () => {
    getClaims.mockResolvedValue({ data: { claims: {} }, error: null })

    expect(await getAdminActor()).toBeNull()
  })

  it('si Supabase falla, null y el error al log', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    getClaims.mockRejectedValue(new Error('caído'))

    expect(await getAdminActor()).toBeNull()
    expect(log).toHaveBeenCalled()
  })
})
