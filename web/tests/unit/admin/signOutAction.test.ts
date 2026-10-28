import { beforeEach, describe, expect, it, vi } from 'vitest'

let signOut: ReturnType<typeof vi.fn>
const createClient = vi.fn(async () => ({ auth: { signOut } }))
const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`)
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClient(),
}))

vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirect(path),
}))

beforeEach(() => {
  redirect.mockClear()
  signOut = vi.fn().mockResolvedValue({ error: null })
  createClient.mockClear()
})

// SEC-ADM-A1: cierre de sesión.
describe('signOutAction', () => {
  it('cierra solo la sesión de este navegador y vuelve al login', async () => {
    const { signOutAction } = await import('@/app/admin/(panel)/authActions')

    await expect(signOutAction()).rejects.toThrow('NEXT_REDIRECT:/admin/login')

    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('no exige sesión de admin: una sesión caducada también puede salir', async () => {
    const { signOutAction } = await import('@/app/admin/(panel)/authActions')

    // Ni `isAdminRequest` ni `is_admin` intervienen: solo createClient.
    await expect(signOutAction()).rejects.toThrow('NEXT_REDIRECT')

    expect(createClient).toHaveBeenCalledTimes(1)
  })

  it('si Supabase falla al cerrar, igualmente vuelve al login', async () => {
    const { signOutAction } = await import('@/app/admin/(panel)/authActions')

    signOut.mockRejectedValue(new Error('red caída'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(signOutAction()).rejects.toThrow('NEXT_REDIRECT:/admin/login')
  })
})
