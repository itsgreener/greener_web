import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  getById: vi.fn(),
  othersGet: vi.fn(),
  othersFreq: vi.fn(),
  translations: vi.fn(),
  caseDetail: vi.fn(),
  caseCarousel: vi.fn(),
  episode: vi.fn(),
  versions: vi.fn(),
  pins: vi.fn(),
  warming: vi.fn(),
}))

vi.mock('@/modules/content/container', () => ({
  contents: { getById: m.getById },
  others: {
    getByContentId: m.othersGet,
    listPublishedFrequencies: m.othersFreq,
  },
  contentTranslations: { listByContentId: m.translations },
  caseDetails: { getByContentId: m.caseDetail },
  caseCarousels: { listByContentId: m.caseCarousel },
  episodes: { getByContentId: m.episode },
}))
vi.mock('@/modules/media/container', () => ({
  contentWarming: { countPendingWarming: m.warming },
}))
vi.mock('@/modules/packages/container', () => ({
  htmlPackages: { listVersions: m.versions },
}))
vi.mock('@/modules/pin/container', () => ({
  pins: { listByContentId: m.pins },
}))

import { loadEditorData } from '@/app/admin/(panel)/contents/[id]/edit/loadEditorData'

beforeEach(() => {
  vi.clearAllMocks()
  m.translations.mockResolvedValue([])
  m.caseDetail.mockResolvedValue({ client: 'x' })
  m.caseCarousel.mockResolvedValue([{ id: 'c' }])
  m.episode.mockResolvedValue({ id: 'e' })
  m.versions.mockResolvedValue([{ version: 1 }])
  m.pins.mockResolvedValue([{ id: 'p' }])
  m.warming.mockResolvedValue(3)
  m.othersFreq.mockResolvedValue([])
})

describe('loadEditorData', () => {
  it('devuelve null si el contenido no existe y no lee nada más', async () => {
    m.getById.mockResolvedValue(null)

    expect(await loadEditorData('x')).toBeNull()
    expect(m.translations).not.toHaveBeenCalled()
  })

  it('un caso carga ficha y carrusel, no episodio ni paquete', async () => {
    m.getById.mockResolvedValue({ id: 'a', type: 'case' })

    const data = await loadEditorData('a')

    expect(data?.caseDetail).toEqual({ client: 'x' })
    expect(data?.caseCarousel).toEqual([{ id: 'c' }])
    expect(data?.episode).toBeNull()
    expect(data?.packageVersions).toEqual([])
    expect(data?.pins).toEqual([{ id: 'p' }])
    expect(data?.pendingWarming).toBe(3)
    expect(m.versions).not.toHaveBeenCalled()
  })

  it('un episodio carga su episodio y no la ficha de caso', async () => {
    m.getById.mockResolvedValue({ id: 'a', type: 'episode' })

    const data = await loadEditorData('a')

    expect(data?.episode).toEqual({ id: 'e' })
    expect(data?.caseDetail).toBeNull()
    expect(data?.caseCarousel).toEqual([])
    expect(m.caseDetail).not.toHaveBeenCalled()
  })

  it('una tool carga las versiones de paquete', async () => {
    m.getById.mockResolvedValue({ id: 'a', type: 'tool' })

    const data = await loadEditorData('a')

    expect(data?.packageVersions).toEqual([{ version: 1 }])
    expect(data?.otherDetail).toBeNull()
    expect(m.othersGet).not.toHaveBeenCalled()
  })

  it('una newsletter no carga pines ni paquete', async () => {
    m.getById.mockResolvedValue({ id: 'a', type: 'other' })
    m.othersGet.mockResolvedValue({ kind: 'newsletter' })

    const data = await loadEditorData('a')

    expect(data?.otherKind).toBe('newsletter')
    expect(data?.capabilities.hasPins).toBe(false)
    expect(data?.pins).toEqual([])
    expect(data?.packageVersions).toEqual([])
    expect(m.pins).not.toHaveBeenCalled()
  })

  it('una página satélite carga paquete y pines', async () => {
    m.getById.mockResolvedValue({ id: 'a', type: 'other' })
    m.othersGet.mockResolvedValue({ kind: 'page' })

    const data = await loadEditorData('a')

    expect(data?.packageVersions).toEqual([{ version: 1 }])
    expect(data?.pins).toEqual([{ id: 'p' }])
  })

  it('si fallan las frecuencias o el calentamiento, el editor sigue cargando', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    m.getById.mockResolvedValue({ id: 'a', type: 'other' })
    m.othersGet.mockResolvedValue({ kind: 'page' })
    m.othersFreq.mockRejectedValue(new Error('freq'))
    m.warming.mockRejectedValue(new Error('warm'))

    const data = await loadEditorData('a')

    expect(data?.otherFrequencies).toEqual([])
    expect(data?.pendingWarming).toBeNull()
    spy.mockRestore()
  })
})
