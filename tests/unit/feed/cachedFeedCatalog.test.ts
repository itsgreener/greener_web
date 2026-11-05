import { beforeEach, describe, expect, it, vi } from 'vitest'

const getFeedDataset = vi.fn()
const getFeedConfig = vi.fn()
const getFeedInterludes = vi.fn()

// unstable_cache necesita el runtime de Next: aquí se sustituye por un
// envoltorio que recuerda las opciones y deja pasar la llamada.
const cacheOptions = vi.hoisted(() => ({ current: null as unknown }))

vi.mock('next/cache', () => ({
  unstable_cache: (
    fn: (...args: unknown[]) => unknown,
    _keys: string[],
    options: unknown,
  ) => {
    cacheOptions.current = options
    return fn
  },
}))

vi.mock('@/modules/feed/infrastructure/supabaseFeedSource', () => ({
  getFeedDataset: (...args: unknown[]) => getFeedDataset(...args),
  getFeedConfig: (...args: unknown[]) => getFeedConfig(...args),
  getFeedInterludes: (...args: unknown[]) => getFeedInterludes(...args),
  supabaseFeedCatalog: {
    dataset: vi.fn(),
    directoryByIds: vi.fn(),
    config: vi.fn(),
    interludes: vi.fn(),
  },
}))

const DATASET = {
  snapshot: {
    cases: [
      { contentId: 'c1', pinIds: ['p1'], force: 1 },
      { contentId: 'c2', pinIds: ['p2'], force: 1 },
    ],
    insights: [],
    tools: [],
    channel: [],
    other: [],
  },
  pinDirectory: {
    p1: { contentId: 'c1' },
    p2: { contentId: 'c2' },
  },
}

beforeEach(() => {
  getFeedDataset.mockReset().mockResolvedValue(DATASET)
})

describe('cachedFeedCatalog', () => {
  it('cachea el universo por scope y lo etiqueta para invalidarlo desde el ABM', async () => {
    await import('@/modules/feed/infrastructure/cachedFeedCatalog')

    expect(cacheOptions.current).toEqual({
      tags: ['feed-dataset'],
      revalidate: 60,
    })
  })

  it('pide a Supabase el universo del scope SIN excluir nada (la entrada de caché es una por scope)', async () => {
    const { cachedFeedCatalog } =
      await import('@/modules/feed/infrastructure/cachedFeedCatalog')

    await cachedFeedCatalog.dataset('tools', 'c1')

    expect(getFeedDataset).toHaveBeenCalledWith('tools')
  })

  it('aplica la exclusión de la ficha en memoria, después de la caché', async () => {
    const { cachedFeedCatalog } =
      await import('@/modules/feed/infrastructure/cachedFeedCatalog')

    const result = await cachedFeedCatalog.dataset('work', 'c1')

    expect(result.snapshot.cases.map((c) => c.contentId)).toEqual(['c2'])
    expect(Object.keys(result.pinDirectory)).toEqual(['p2'])
  })

  it('sin exclusión devuelve el universo tal cual', async () => {
    const { cachedFeedCatalog } =
      await import('@/modules/feed/infrastructure/cachedFeedCatalog')

    expect(await cachedFeedCatalog.dataset('home', null)).toEqual(DATASET)
  })

  it('la configuración (tamaño de lote, cuotas) también sale de la caché, que se lee en cada lote', async () => {
    const config = {
      ratios: { cases: 70, insights: 15, tools: 5, channel: 5, other: 5 },
      batchSize: 40,
    }
    getFeedConfig.mockResolvedValue(config)
    const { cachedFeedCatalog } =
      await import('@/modules/feed/infrastructure/cachedFeedCatalog')

    expect(await cachedFeedCatalog.config()).toEqual(config)
    expect(getFeedConfig).toHaveBeenCalledTimes(1)
  })

  it('los interludios (`other`) también salen de la caché etiquetada', async () => {
    const interludes = [
      {
        kind: 'newsletter',
        contentId: 'n1',
        frequency: 100,
        title: 'T',
        text: null,
      },
    ]
    getFeedInterludes.mockResolvedValue(interludes)
    const { cachedFeedCatalog } =
      await import('@/modules/feed/infrastructure/cachedFeedCatalog')

    expect(await cachedFeedCatalog.interludes()).toEqual(interludes)
    expect(getFeedInterludes).toHaveBeenCalledTimes(1)
  })
})
