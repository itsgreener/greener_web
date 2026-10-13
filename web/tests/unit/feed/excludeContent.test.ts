import { describe, it, expect } from 'vitest'
import { excludeContent } from '@/modules/feed/domain/excludeContent'
import type { FeedDataset } from '@/modules/feed/domain/feedReadModels'

const entry = (contentId: string) =>
  ({ contentId }) as FeedDataset['pinDirectory'][string]

function dataset(): FeedDataset {
  return {
    snapshot: {
      cases: [
        { contentId: 'c1', pinIds: ['p1'], force: 1 },
        { contentId: 'c2', pinIds: ['p2'], force: 2 },
      ],
      insights: [{ contentId: 'i1', pinIds: ['p3'] }],
      tools: [],
      channel: [],
      other: [],
    },
    pinDirectory: { p1: entry('c1'), p2: entry('c2'), p3: entry('i1') },
  }
}

describe('excludeContent', () => {
  it('quita el contenido del universo y de la ficha de pines', () => {
    const result = excludeContent(dataset(), 'c1')

    expect(result.snapshot.cases.map((c) => c.contentId)).toEqual(['c2'])
    expect(result.snapshot.insights).toHaveLength(1)
    expect(Object.keys(result.pinDirectory)).toEqual(['p2', 'p3'])
  })

  it('un contenido que no está en el universo lo deja igual', () => {
    expect(excludeContent(dataset(), 'nada')).toEqual(dataset())
  })

  it('no muta el dataset de entrada (puede venir de caché)', () => {
    const original = dataset()

    excludeContent(original, 'c1')

    expect(original).toEqual(dataset())
  })
})
