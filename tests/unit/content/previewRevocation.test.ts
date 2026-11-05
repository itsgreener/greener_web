import { beforeEach, describe, expect, it, vi } from 'vitest'

import { makeRevokePreviewLinks } from '@/modules/content/application/revokePreviewLinks'
import { isPreviewLinkRevoked } from '@/modules/content/domain/previewRevocations'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

const rpc = vi.fn()
const maybeSingle = vi.fn()
const eq = vi.fn(() => ({ maybeSingle }))
const select = vi.fn(() => ({ eq }))
const from = vi.fn(() => ({ select }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ rpc }),
}))

import {
  createSupabasePreviewRevocationReader,
  supabasePreviewRevoker,
} from '@/modules/content/infrastructure/supabasePreviewRevocations'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('isPreviewLinkRevoked', () => {
  it('sin revocación, el enlace vale', () => {
    expect(isPreviewLinkRevoked(1000, null)).toBe(false)
  })

  it('emitido antes o en el mismo instante que la revocación: rechazado', () => {
    expect(isPreviewLinkRevoked(999, 1000)).toBe(true)
    expect(isPreviewLinkRevoked(1000, 1000)).toBe(true)
  })

  it('emitido después: vale', () => {
    expect(isPreviewLinkRevoked(1001, 1000)).toBe(false)
  })
})

describe('makeRevokePreviewLinks', () => {
  it('revoca con la hora actual', async () => {
    const revoker = { revoke: vi.fn(async () => true) }

    const revoked = await makeRevokePreviewLinks({
      revoker,
      now: () => 1234,
    })(CONTENT_ID)

    expect(revoked).toBe(true)
    expect(revoker.revoke).toHaveBeenCalledWith(CONTENT_ID, 1234)
  })

  it('devuelve false si el contenido no existe', async () => {
    const revoker = { revoke: vi.fn(async () => false) }

    expect(await makeRevokePreviewLinks({ revoker })(CONTENT_ID)).toBe(false)
  })
})

describe('supabasePreviewRevoker', () => {
  it('llama a revoke_content_preview_links con la fecha en ISO', async () => {
    rpc.mockResolvedValue({ data: CONTENT_ID, error: null })

    await expect(
      supabasePreviewRevoker.revoke(
        CONTENT_ID,
        new Date('2026-10-29T10:00:00.000Z').getTime(),
      ),
    ).resolves.toBe(true)

    expect(rpc).toHaveBeenCalledWith('revoke_content_preview_links', {
      p_content_id: CONTENT_ID,
      p_revoked_at: '2026-10-29T10:00:00.000Z',
    })
  })

  it('contenido inexistente (P0002): false, no error', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'Content not found', code: 'P0002' },
    })

    await expect(supabasePreviewRevoker.revoke(CONTENT_ID, 1)).resolves.toBe(
      false,
    )
  })

  it('cualquier otro error se propaga', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'Not authorized', code: '42501' },
    })

    await expect(supabasePreviewRevoker.revoke(CONTENT_ID, 1)).rejects.toThrow(
      'Not authorized',
    )
  })
})

describe('createSupabasePreviewRevocationReader', () => {
  function reader() {
    return createSupabasePreviewRevocationReader({
      from,
    } as unknown as Parameters<typeof createSupabasePreviewRevocationReader>[0])
  }

  it('devuelve la fecha de revocación en milisegundos', async () => {
    maybeSingle.mockResolvedValue({
      data: { preview_revoked_at: '2026-10-29T10:00:00+00:00' },
      error: null,
    })

    await expect(reader().revokedAt(CONTENT_ID)).resolves.toBe(
      new Date('2026-10-29T10:00:00.000Z').getTime(),
    )
    expect(from).toHaveBeenCalledWith('content')
    expect(select).toHaveBeenCalledWith('preview_revoked_at')
    expect(eq).toHaveBeenCalledWith('id', CONTENT_ID)
  })

  it('null si nunca se ha revocado o el contenido no existe', async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { preview_revoked_at: null },
      error: null,
    })
    maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    await expect(reader().revokedAt(CONTENT_ID)).resolves.toBeNull()
    await expect(reader().revokedAt(CONTENT_ID)).resolves.toBeNull()
  })

  it('un error de lectura se propaga (no se sirve un borrador sin poder comprobar la revocación)', async () => {
    maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'boom', code: 'XX000' },
    })

    await expect(reader().revokedAt(CONTENT_ID)).rejects.toThrow('boom')
  })
})
