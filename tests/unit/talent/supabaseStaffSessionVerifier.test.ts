import { beforeEach, describe, expect, it, vi } from 'vitest'

const getUser = vi.hoisted(() => vi.fn())

vi.mock('@/modules/talent/infrastructure/talentSupabaseClient', () => ({
  getTalentClient: () => ({ auth: { getUser } }),
}))

const { supabaseStaffSessionVerifier } =
  await import('@/modules/talent/infrastructure/supabaseStaffSessionVerifier')

beforeEach(() => {
  getUser.mockReset()
})

describe('supabaseStaffSessionVerifier', () => {
  it('pregunta a Auth por el token y devuelve el correo', async () => {
    getUser.mockResolvedValue({
      data: {
        user: { email: 'ana@itsgreener.com', email_confirmed_at: '2026-10-01' },
      },
      error: null,
    })

    expect(await supabaseStaffSessionVerifier.verify('jwt')).toEqual({
      email: 'ana@itsgreener.com',
    })
    expect(getUser).toHaveBeenCalledWith('jwt')
  })

  it.each([
    [
      'Auth rechaza el token',
      { data: { user: null }, error: { message: 'x' } },
    ],
    ['no hay usuario', { data: { user: null }, error: null }],
    [
      'sin correo',
      { data: { user: { email: null, email_confirmed_at: 'x' } }, error: null },
    ],
    [
      'correo sin confirmar',
      {
        data: { user: { email: 'a@b.co', email_confirmed_at: null } },
        error: null,
      },
    ],
  ])('%s → null', async (_name, response) => {
    getUser.mockResolvedValue(response)

    expect(await supabaseStaffSessionVerifier.verify('jwt')).toBeNull()
  })

  it('si Auth falla por red, null (no lanza)', async () => {
    getUser.mockRejectedValue(new Error('red'))

    expect(await supabaseStaffSessionVerifier.verify('jwt')).toBeNull()
  })
})
