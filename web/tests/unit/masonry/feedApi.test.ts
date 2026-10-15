import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchFeedBatch,
  requestedBatchSize,
} from '@/components/masonry/feedApi'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('requestedBatchSize', () => {
  it('en móvil (< 640 px) pide lotes de 20; en el resto no pide nada', () => {
    expect(requestedBatchSize(390)).toBe(20)
    expect(requestedBatchSize(639)).toBe(20)
    expect(requestedBatchSize(640)).toBeNull()
    expect(requestedBatchSize(1440)).toBeNull()
  })
})

describe('fetchFeedBatch — URL', () => {
  function stubWindowAndFetch(innerWidth: number) {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ items: [] }),
    }))
    vi.stubGlobal('window', { innerWidth })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('en escritorio no añade size', async () => {
    const fetchMock = stubWindowAndFetch(1440)
    await fetchFeedBatch('s1', null)
    expect(fetchMock).toHaveBeenCalledWith('/api/feed/s1')
  })

  it('en móvil añade size=20 y conserva el cursor codificado', async () => {
    const fetchMock = stubWindowAndFetch(390)
    await fetchFeedBatch('s1', 'a.b/c')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/feed/s1?cursor=a.b%2Fc&size=20',
    )
  })
})

describe('fetchFeedBatch — newsletter', () => {
  it('descarta los elementos de newsletter hasta que exista su tarjeta (fase 3) y conserva el resto', async () => {
    vi.stubGlobal('window', { innerWidth: 1440 })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          items: [
            { pinId: 'p1', kind: 'case' },
            { pinId: 'newsletter:n1:0', kind: 'newsletter' },
            { pinId: 'p2', kind: 'other' },
          ],
          cursor: 'c',
          hasMore: true,
        }),
      })),
    )

    const batch = await fetchFeedBatch('s1', null)

    expect(batch.items.map((item) => item.pinId)).toEqual(['p1', 'p2'])
    expect(batch.cursor).toBe('c')
  })
})
