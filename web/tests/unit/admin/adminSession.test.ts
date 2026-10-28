import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * La sesión de admin real (el setup global sustituye `isAdminRequest` y
 * `requireAdminPage`; aquí se prueba el módulo auténtico con Supabase
 * mockeado). SEC-ADM-A2 y A5.
 */

const getClaims = vi.hoisted(() => vi.fn())
const rpc = vi.hoisted(() => vi.fn())
const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  }),
)

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims }, rpc })),
}))

vi.mock('next/navigation', () => ({ redirect }))

/**
 * `checkAdminSession` se memoiza con `React.cache`, que solo actúa dentro de
 * una petición de Next (fuera es un paso directo): la memoización no se puede
 * probar aquí. Cada caso importa una copia nueva del módulo por si acaso.
 */
async function loadSession() {
  vi.resetModules()

  return vi.importActual<typeof import('@/lib/auth/adminSession')>(
    '@/lib/auth/adminSession',
  )
}

beforeEach(() => {
  getClaims.mockReset()
  rpc.mockReset()
  redirect.mockClear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

function asAdmin(email: unknown = 'ana@itsgreener.com') {
  getClaims.mockResolvedValue({ data: { claims: { email } }, error: null })
  rpc.mockResolvedValue({ data: true, error: null })
}

describe('getAdminActor', () => {
  it('devuelve el email de la sesión de admin sacado de las mismas claims', async () => {
    asAdmin()
    const session = await loadSession()

    await expect(session.getAdminActor()).resolves.toEqual({
      email: 'ana@itsgreener.com',
    })
    expect(getClaims).toHaveBeenCalledTimes(1)
  })

  it('sin email en las claims no hay actor', async () => {
    asAdmin(null)
    const session = await loadSession()

    await expect(session.getAdminActor()).resolves.toBeNull()
  })

  it('si no es admin no hay actor', async () => {
    getClaims.mockResolvedValue({
      data: { claims: { email: 'x@otro.com' } },
      error: null,
    })
    rpc.mockResolvedValue({ data: false, error: null })
    const session = await loadSession()

    await expect(session.getAdminActor()).resolves.toBeNull()
  })
})

describe('requireAdminPage', () => {
  it('con sesión de admin no hace nada', async () => {
    asAdmin()
    const session = await loadSession()

    await expect(session.requireAdminPage()).resolves.toBeUndefined()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('sin sesión manda al login', async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error('sin sesión') })
    const session = await loadSession()

    await expect(session.requireAdminPage()).rejects.toThrow(
      'NEXT_REDIRECT:/admin/login',
    )
  })

  it('con sesión de un usuario que no es admin manda al login', async () => {
    getClaims.mockResolvedValue({
      data: { claims: { email: 'x@otro.com' } },
      error: null,
    })
    rpc.mockResolvedValue({ data: false, error: null })
    const session = await loadSession()

    await expect(session.requireAdminPage()).rejects.toThrow(
      'NEXT_REDIRECT:/admin/login',
    )
  })

  it('si Supabase falla, falla cerrado', async () => {
    getClaims.mockRejectedValue(new Error('red'))
    const session = await loadSession()

    await expect(session.requireAdminPage()).rejects.toThrow(
      'NEXT_REDIRECT:/admin/login',
    )
  })
})

describe('errores de control de Next', () => {
  it.each([
    'DYNAMIC_SERVER_USAGE',
    'NEXT_REDIRECT;replace;/x;307;',
    'NEXT_PRERENDER_INTERRUPTED',
  ])(
    'deja pasar el error «%s» en lugar de tragárselo como «sin sesión»',
    async (digest) => {
      getClaims.mockRejectedValue(
        Object.assign(new Error('control'), { digest }),
      )
      const session = await loadSession()

      await expect(session.requireAdminPage()).rejects.toMatchObject({ digest })
      expect(redirect).not.toHaveBeenCalled()
    },
  )

  it('un error cualquiera sigue contando como «sin sesión»', async () => {
    getClaims.mockRejectedValue(new Error('red'))
    const session = await loadSession()

    await expect(session.requireAdminPage()).rejects.toThrow(
      'NEXT_REDIRECT:/admin/login',
    )
  })
})
