import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}))

vi.mock('@/modules/content/container', () => ({
  episodes: { getByContentId: vi.fn() },
  contents: { getById: vi.fn() },
  upsertEpisode: vi.fn(),
}))

import { saveEpisodeAction } from '@/app/admin/(panel)/contents/[id]/edit/episodeActions'
import { contents, episodes, upsertEpisode } from '@/modules/content/container'

const getEpisode = vi.mocked(episodes.getByContentId)
const getContent = vi.mocked(contents.getById)

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

function form() {
  const data = new FormData()
  data.set('contentId', CONTENT_ID)
  data.set('program', 'brand_the_future')
  data.set('provider', 'youtube')
  data.set('embedId', 'XQ4H5A4nNVk')
  data.set('episodeKind', 'podcast')
  return data
}

describe('saveEpisodeAction — campos ocultos del formulario', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('conserva número, invitado, cargo, empresa, fecha, duración e idioma ya guardados', async () => {
    getEpisode.mockResolvedValue({
      contentId: CONTENT_ID,
      program: 'brand_to_table',
      number: 7,
      guest: 'Ana',
      role: 'CEO',
      company: 'Acme',
      episodeDate: '2026-05-01',
      durationSeconds: 2400,
      provider: 'spotify',
      embedId: 'old',
      language: 'en',
      episodeKind: 'podcast',
    })

    const state = await saveEpisodeAction({}, form())

    expect(state.success).toBe(true)
    expect(upsertEpisode).toHaveBeenCalledWith({
      contentId: CONTENT_ID,
      program: 'brand_the_future',
      number: 7,
      guest: 'Ana',
      role: 'CEO',
      company: 'Acme',
      episodeDate: '2026-05-01',
      durationSeconds: 2400,
      provider: 'youtube',
      embedId: 'XQ4H5A4nNVk',
      language: 'en',
      episodeKind: 'podcast',
    })
  })

  it('en un episodio nuevo deja los opcionales a null y toma el idioma por defecto del contenido', async () => {
    getEpisode.mockResolvedValue(null)
    getContent.mockResolvedValue({
      defaultLocale: 'es',
    } as Awaited<ReturnType<typeof contents.getById>>)

    const state = await saveEpisodeAction({}, form())

    expect(state.success).toBe(true)
    expect(upsertEpisode).toHaveBeenCalledWith(
      expect.objectContaining({
        number: null,
        guest: null,
        role: null,
        company: null,
        episodeDate: null,
        durationSeconds: null,
        language: 'es',
      }),
    )
  })

  it('si el contenido ya no existe, avisa en lugar de guardar', async () => {
    getEpisode.mockResolvedValue(null)
    getContent.mockResolvedValue(null)

    const state = await saveEpisodeAction({}, form())

    expect(state.formError).toBe('El contenido ya no existe.')
    expect(upsertEpisode).not.toHaveBeenCalled()
  })
})
