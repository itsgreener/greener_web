import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isAdminRequest } from '@/lib/auth/adminSession'
import { dbError } from '@tests/helpers/dbError'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

vi.mock('@/lib/cache/feedCache', () => ({
  invalidateFeedCache: vi.fn(),
}))

vi.mock('@/modules/content/container', () => ({
  createContent: vi.fn(),
  createOther: vi.fn(),
  updateOtherFrequency: vi.fn(),
}))

import { createContentAction } from '@/app/admin/(panel)/contents/actions'
import { saveOtherFrequencyAction } from '@/app/admin/(panel)/contents/[id]/edit/otherActions'
import { invalidateFeedCache } from '@/lib/cache/feedCache'
import {
  createContent,
  createOther,
  updateOtherFrequency,
} from '@/modules/content/container'

function formData(entries: Record<string, string>) {
  const data = new FormData()

  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value)
  }

  return data
}

const OTHER_FORM = {
  type: 'other',
  kind: 'newsletter',
  frequency: '100',
  slug: 'suscribete',
  defaultLocale: 'es',
  title: 'Suscríbete',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createContentAction — alta de un other', () => {
  it('crea el other con su subtipo y su frecuencia, y abre el editor', async () => {
    vi.mocked(createOther).mockResolvedValue(CONTENT_ID)

    await expect(createContentAction({}, formData(OTHER_FORM))).rejects.toThrow(
      `NEXT_REDIRECT:/admin/contents/${CONTENT_ID}/edit`,
    )

    expect(createOther).toHaveBeenCalledWith({
      slug: 'suscribete',
      defaultLocale: 'es',
      title: 'Suscríbete',
      kind: 'newsletter',
      frequency: 100,
    })
    expect(createContent).not.toHaveBeenCalled()
  })

  it('sin subtipo no crea nada y avisa en el campo kind', async () => {
    const state = await createContentAction(
      {},
      formData({ ...OTHER_FORM, kind: '' }),
    )

    expect(state.fieldErrors?.kind?.[0]).toBeTruthy()
    expect(createOther).not.toHaveBeenCalled()
  })

  it('con una frecuencia por debajo de 25 no crea nada y avisa en el campo', async () => {
    const state = await createContentAction(
      {},
      formData({ ...OTHER_FORM, frequency: '10' }),
    )

    expect(state.fieldErrors?.frequency?.[0]).toContain('25')
    expect(createOther).not.toHaveBeenCalled()
  })

  it('una frecuencia vacía o no numérica se rechaza', async () => {
    const state = await createContentAction(
      {},
      formData({ ...OTHER_FORM, frequency: '' }),
    )

    expect(state.fieldErrors?.frequency?.[0]).toBeTruthy()
  })

  it('un slug repetido sale como error del campo slug', async () => {
    vi.mocked(createOther).mockRejectedValue(dbError('23505', 'duplicate key'))

    const state = await createContentAction({}, formData(OTHER_FORM))

    expect(state.fieldErrors?.slug?.[0]).toBe('Este slug ya existe')
  })
})

describe('createContentAction — newsletter sin título, slug ni idioma', () => {
  const NEWSLETTER_FORM = {
    type: 'other',
    kind: 'newsletter',
    frequency: '100',
  }

  it('rellena título, slug e idioma por defecto cuando el formulario no los envía', async () => {
    vi.mocked(createOther).mockResolvedValue(CONTENT_ID)

    await expect(
      createContentAction({}, formData(NEWSLETTER_FORM)),
    ).rejects.toThrow(`NEXT_REDIRECT:/admin/contents/${CONTENT_ID}/edit`)

    expect(createOther).toHaveBeenCalledWith({
      slug: expect.stringMatching(/^newsletter-[0-9a-f]{8}$/),
      defaultLocale: 'es',
      title: 'Newsletter',
      kind: 'newsletter',
      frequency: 100,
    })
  })

  it('cada alta genera un slug distinto', async () => {
    vi.mocked(createOther).mockResolvedValue(CONTENT_ID)

    for (let i = 0; i < 2; i++) {
      await expect(
        createContentAction({}, formData(NEWSLETTER_FORM)),
      ).rejects.toThrow('NEXT_REDIRECT')
    }

    const [first, second] = vi
      .mocked(createOther)
      .mock.calls.map(([input]) => input.slug)

    expect(first).not.toBe(second)
  })

  it('si el formulario sí envía los datos, no se pisan con los de por defecto', async () => {
    vi.mocked(createOther).mockResolvedValue(CONTENT_ID)

    await expect(
      createContentAction(
        {},
        formData({
          ...NEWSLETTER_FORM,
          slug: 'boletin',
          defaultLocale: 'en',
          title: 'Join us',
        }),
      ),
    ).rejects.toThrow('NEXT_REDIRECT')

    expect(createOther).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'boletin',
        defaultLocale: 'en',
        title: 'Join us',
      }),
    )
  })

  it('una página satélite sigue exigiendo título, slug e idioma', async () => {
    const state = await createContentAction(
      {},
      formData({ type: 'other', kind: 'page', frequency: '100' }),
    )

    expect(state.fieldErrors?.title?.[0]).toBeTruthy()
    expect(state.fieldErrors?.slug?.[0]).toBeTruthy()
    expect(createOther).not.toHaveBeenCalled()
  })

  it('un choque del slug generado sale como error del formulario, no del campo oculto', async () => {
    vi.mocked(createOther).mockRejectedValue(dbError('23505', 'duplicate key'))

    const state = await createContentAction({}, formData(NEWSLETTER_FORM))

    expect(state.fieldErrors?.slug).toBeUndefined()
    expect(state.formError).toContain('Inténtalo de nuevo')
  })
})

describe('createContentAction — el resto de tipos no cambia', () => {
  it('un case se crea con createContent y no pide subtipo ni frecuencia', async () => {
    vi.mocked(createContent).mockResolvedValue(CONTENT_ID)

    await expect(
      createContentAction(
        {},
        formData({
          type: 'case',
          slug: 'mi-caso',
          defaultLocale: 'es',
          title: 'Mi caso',
        }),
      ),
    ).rejects.toThrow(`NEXT_REDIRECT:/admin/contents/${CONTENT_ID}/edit`)

    expect(createContent).toHaveBeenCalledOnce()
    expect(createOther).not.toHaveBeenCalled()
  })
})

describe('saveOtherFrequencyAction', () => {
  it('guarda la frecuencia e invalida la caché del feed', async () => {
    vi.mocked(updateOtherFrequency).mockResolvedValue(CONTENT_ID)

    const state = await saveOtherFrequencyAction(
      {},
      formData({ contentId: CONTENT_ID, frequency: '60' }),
    )

    expect(state.success).toBe(true)
    expect(updateOtherFrequency).toHaveBeenCalledWith({
      contentId: CONTENT_ID,
      frequency: 60,
    })
    expect(invalidateFeedCache).toHaveBeenCalledOnce()
  })

  it('con menos de 25 avisa en el campo y no guarda ni invalida', async () => {
    const state = await saveOtherFrequencyAction(
      {},
      formData({ contentId: CONTENT_ID, frequency: '24' }),
    )

    expect(state.fieldErrors?.frequency?.[0]).toContain('25')
    expect(updateOtherFrequency).not.toHaveBeenCalled()
    expect(invalidateFeedCache).not.toHaveBeenCalled()
  })

  it('un other sin subtipo (ZG017) se explica en lugar del mensaje genérico', async () => {
    vi.mocked(updateOtherFrequency).mockRejectedValue(
      dbError('ZG017', 'Este contenido other no tiene subtipo'),
    )

    const state = await saveOtherFrequencyAction(
      {},
      formData({ contentId: CONTENT_ID, frequency: '60' }),
    )

    expect(state.formError).toContain('no tiene subtipo')
    expect(invalidateFeedCache).not.toHaveBeenCalled()
  })

  it('un fallo inesperado sale con el mensaje genérico', async () => {
    vi.mocked(updateOtherFrequency).mockRejectedValue(new Error('boom'))

    const state = await saveOtherFrequencyAction(
      {},
      formData({ contentId: CONTENT_ID, frequency: '60' }),
    )

    expect(state.formError).toBe('No se ha podido guardar la frecuencia.')
  })

  it('sin sesión de admin no hace nada', async () => {
    vi.mocked(isAdminRequest).mockResolvedValueOnce(false)

    const state = await saveOtherFrequencyAction(
      {},
      formData({ contentId: CONTENT_ID, frequency: '60' }),
    )

    expect(state.formError).toBeTruthy()
    expect(updateOtherFrequency).not.toHaveBeenCalled()
  })
})
