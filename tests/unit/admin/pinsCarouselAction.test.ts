import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * La acción de la casilla «formar un carrusel con los pines» (§2.150): llama
 * al caso de uso y traduce el resultado o el error para el ABM.
 */

const CONTENT_ID = '11111111-1111-4111-8111-111111111111'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}))

vi.mock('@/modules/content/container', () => ({
  contents: { getById: vi.fn() },
  episodes: { getByContentId: vi.fn() },
  upsertEpisode: vi.fn(),
  setEpisodePinsCarousel: vi.fn(),
}))

import { revalidatePath } from 'next/cache'
import { setPinsCarouselAction } from '@/app/admin/(panel)/contents/[id]/edit/episodeActions'
import { setEpisodePinsCarousel } from '@/modules/content/container'
import { isAdminRequest } from '@/lib/auth/adminSession'
import { dbError } from '@tests/helpers/dbError'

const setCarousel = vi.mocked(setEpisodePinsCarousel)

describe('setPinsCarouselAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('activa el carrusel y refresca el editor', async () => {
    setCarousel.mockResolvedValue(true)

    const result = await setPinsCarouselAction(CONTENT_ID, true)

    expect(result).toEqual({ ok: true, enabled: true })
    expect(setCarousel).toHaveBeenCalledWith({ id: CONTENT_ID, enabled: true })
    expect(revalidatePath).toHaveBeenCalledWith(
      `/admin/contents/${CONTENT_ID}/edit`,
    )
  })

  it('lo desactiva con el mismo camino', async () => {
    setCarousel.mockResolvedValue(false)

    expect(await setPinsCarouselAction(CONTENT_ID, false)).toEqual({
      ok: true,
      enabled: false,
    })
  })

  it('si los pines tienen ratios distintos explica el motivo', async () => {
    setCarousel.mockRejectedValue(dbError('ZG019', 'ratios distintos'))

    const result = await setPinsCarouselAction(CONTENT_ID, true)

    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('mismo ratio'),
    })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('si no es un episodio lo dice', async () => {
    setCarousel.mockRejectedValue(dbError('ZG007', 'no es episodio'))

    expect(await setPinsCarouselAction(CONTENT_ID, true)).toEqual({
      ok: false,
      error: 'Este contenido no es de tipo Episode.',
    })
  })

  it('un fallo de infraestructura sale con el mensaje genérico', async () => {
    setCarousel.mockRejectedValue(new Error('timeout'))

    expect(await setPinsCarouselAction(CONTENT_ID, true)).toEqual({
      ok: false,
      error: 'No se ha podido cambiar el carrusel de pines.',
    })
  })

  it('sin sesión de administrador no llega al caso de uso', async () => {
    vi.mocked(isAdminRequest).mockResolvedValueOnce(false)

    const result = await setPinsCarouselAction(CONTENT_ID, true)

    expect(result.ok).toBe(false)
    expect(setCarousel).not.toHaveBeenCalled()
  })
})
