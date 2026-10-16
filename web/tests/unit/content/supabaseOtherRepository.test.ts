import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isDomainError } from '@/modules/shared/domain/domainError'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

const rpc = vi.fn()
const maybeSingle = vi.fn()
const eq = vi.fn(() => ({ maybeSingle }))
const select = vi.fn(() => ({ eq }))
const from = vi.fn(() => ({ select }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ rpc, from }),
}))

import { supabaseOtherRepository } from '@/modules/content/infrastructure/supabaseOtherRepository'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('supabaseOtherRepository', () => {
  it('createDraft llama a create_other_draft con subtipo y frecuencia', async () => {
    rpc.mockResolvedValue({ data: CONTENT_ID, error: null })

    await expect(
      supabaseOtherRepository.createDraft({
        slug: 'suscribete',
        defaultLocale: 'es',
        title: 'Suscríbete',
        kind: 'newsletter',
        frequency: 100,
      }),
    ).resolves.toBe(CONTENT_ID)

    expect(rpc).toHaveBeenCalledWith('create_other_draft', {
      p_slug: 'suscribete',
      p_default_locale: 'es',
      p_title: 'Suscríbete',
      p_kind: 'newsletter',
      p_frequency: 100,
    })
  })

  it('updateFrequency llama a update_other_frequency', async () => {
    rpc.mockResolvedValue({ data: CONTENT_ID, error: null })

    await supabaseOtherRepository.updateFrequency({
      contentId: CONTENT_ID,
      frequency: 50,
    })

    expect(rpc).toHaveBeenCalledWith('update_other_frequency', {
      p_content_id: CONTENT_ID,
      p_frequency: 50,
    })
  })

  it('un error de la base sale traducido a error de dominio (slug repetido = duplicate)', async () => {
    const error = { message: 'duplicate key', code: '23505' }
    rpc.mockResolvedValue({ data: null, error })

    const failure = await supabaseOtherRepository
      .createDraft({
        slug: 'x',
        defaultLocale: 'es',
        title: 'X',
        kind: 'page',
        frequency: 25,
      })
      .catch((caught: unknown) => caught)

    expect(isDomainError(failure, 'duplicate')).toBe(true)
  })

  it('getByContentId devuelve subtipo y frecuencia, o null si no hay fila', async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { content_id: CONTENT_ID, kind: 'page', frequency: 75 },
      error: null,
    })

    await expect(
      supabaseOtherRepository.getByContentId(CONTENT_ID),
    ).resolves.toEqual({ contentId: CONTENT_ID, kind: 'page', frequency: 75 })

    maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    await expect(
      supabaseOtherRepository.getByContentId(CONTENT_ID),
    ).resolves.toBeNull()
    expect(from).toHaveBeenCalledWith('other_detail')
  })
})

describe('supabaseOtherRepository.listPublishedFrequencies (plan de pendientes, A1)', () => {
  // from('other_detail').select(...).eq('content.status','published')[.neq(...)]
  function stubQuery(result: { data: unknown; error: unknown }) {
    const neq = vi.fn(() => Promise.resolve(result))
    const eqStatus = vi.fn(() =>
      Object.assign(Promise.resolve(result), { neq }),
    )
    const selectList = vi.fn(() => ({ eq: eqStatus }))

    from.mockReturnValueOnce({ select: selectList } as never)

    return { neq, eqStatus, selectList }
  }

  it('devuelve solo las frecuencias de los Other publicados', async () => {
    const { eqStatus, selectList } = stubQuery({
      data: [{ frequency: 100 }, { frequency: 25 }],
      error: null,
    })

    await expect(
      supabaseOtherRepository.listPublishedFrequencies(),
    ).resolves.toEqual([100, 25])

    expect(from).toHaveBeenCalledWith('other_detail')
    expect((selectList.mock.calls[0] as unknown as string[])[0]).toMatch(
      /content!inner\(status\)/,
    )
    expect(eqStatus).toHaveBeenCalledWith('content.status', 'published')
  })

  it('deja fuera al contenido que se está editando', async () => {
    const { neq } = stubQuery({ data: [{ frequency: 50 }], error: null })

    await supabaseOtherRepository.listPublishedFrequencies(CONTENT_ID)

    expect(neq).toHaveBeenCalledWith('content_id', CONTENT_ID)
  })

  it('un error de la base sale como error de repositorio', async () => {
    stubQuery({ data: null, error: { message: 'boom', code: '42501' } })

    await expect(
      supabaseOtherRepository.listPublishedFrequencies(),
    ).rejects.toBeTruthy()
  })
})
