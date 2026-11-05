import { describe, expect, it, vi } from 'vitest'

const createSignedUrl = vi.fn()
const from = vi.fn(() => ({ createSignedUrl }))

vi.mock('@/modules/talent/infrastructure/talentSupabaseClient', () => ({
  getTalentClient: () => ({ storage: { from } }),
}))

const { supabaseTalentStorage } =
  await import('@/modules/talent/infrastructure/supabaseTalentStorage')

describe('createSignedUrl', () => {
  it('firma en el bucket cvs con la caducidad pedida', async () => {
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://talent.supabase.co/sign/x?token=t' },
      error: null,
    })

    expect(
      await supabaseTalentStorage.createSignedUrl('uploads/a.pdf', 60),
    ).toBe('https://talent.supabase.co/sign/x?token=t')
    expect(from).toHaveBeenCalledWith('cvs')
    expect(createSignedUrl).toHaveBeenCalledWith('uploads/a.pdf', 60)
  })

  it('un error de Storage se lanza', async () => {
    createSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'Object not found' },
    })

    await expect(
      supabaseTalentStorage.createSignedUrl('uploads/nada.pdf', 60),
    ).rejects.toThrow('storage.createSignedUrl')
  })

  it('una respuesta sin URL también es un error', async () => {
    createSignedUrl.mockResolvedValue({ data: {}, error: null })

    await expect(
      supabaseTalentStorage.createSignedUrl('uploads/a.pdf', 60),
    ).rejects.toThrow()
  })
})
