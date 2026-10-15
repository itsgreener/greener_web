import { describe, expect, it } from 'vitest'

import { toFeedBatchItem } from '@/modules/feed/domain/feedItemPresentation'
import type { PinDirectoryEntry } from '@/modules/feed/domain/feedReadModels'
import {
  CONTENT_TYPE_TO_KIND,
  isFeedScope,
  typesForScope,
} from '@/modules/feed/domain/feedScope'

describe('feedScope', () => {
  it('cada subhome filtra a un único tipo y home mezcla todos', () => {
    expect(typesForScope('work')).toEqual(['case'])
    expect(typesForScope('insights')).toEqual(['insight'])
    expect(typesForScope('tools')).toEqual(['tool'])
    expect(typesForScope('channel')).toEqual(['episode'])
    // `other` no entra en la home por cuota: se sirve como interludio.
    expect(typesForScope('home')).toEqual([
      'case',
      'insight',
      'tool',
      'episode',
    ])
    expect(typesForScope('home')).not.toContain('other')
  })

  it('un scope desconocido cae en home y no se reconoce como scope', () => {
    expect(isFeedScope('nope')).toBe(false)
    expect(isFeedScope('toString')).toBe(false)
    expect(typesForScope('nope')).toEqual(typesForScope('home'))
  })

  it('cada tipo tiene su cola en el snapshot', () => {
    expect(CONTENT_TYPE_TO_KIND).toEqual({
      case: 'cases',
      insight: 'insights',
      tool: 'tools',
      episode: 'channel',
      other: 'other',
    })
  })
})

describe('toFeedBatchItem', () => {
  const entry = (over: Partial<PinDirectoryEntry> = {}): PinDirectoryEntry => ({
    contentId: 'c1',
    contentType: 'case',
    contentSlug: 'mi-caso',
    ratio: '4:5',
    label: null,
    displayTitle: 'Título',
    displaySecondary: 'Cliente',
    alt: 'alt',
    autoplayMode: null,
    media: [{ kind: 'image', cloudinaryPublicId: 'greener/content/a' }],
    ...over,
  })

  it('case: destino /work/[slug], CTA Watch y textos derivados', () => {
    expect(toFeedBatchItem('pin-1', entry())).toEqual({
      pinId: 'pin-1',
      contentId: 'c1',
      kind: 'case',
      destination: '/work/mi-caso',
      ratio: '4:5',
      label: null,
      displayTitle: 'Título',
      displaySecondary: 'Cliente',
      cta: 'Watch',
      alt: 'alt',
      autoplayMode: null,
      media: [{ kind: 'image', cloudinaryPublicId: 'greener/content/a' }],
    })
  })

  it('tool: el destino lleva el pin de origen codificado y el CTA es Use', () => {
    const item = toFeedBatchItem(
      'pin/1',
      entry({ contentType: 'tool', contentSlug: 'mi-tool' }),
    )

    expect(item.destination).toBe('/tools/mi-tool?pin=pin%2F1')
    expect(item.cta).toBe('Use')
  })

  it('insight: abre directamente la app y el CTA es Read', () => {
    const item = toFeedBatchItem(
      'p',
      entry({ contentType: 'insight', contentSlug: 'mi-insight' }),
    )

    expect(item.destination).toBe('/insights/mi-insight/app')
    expect(item.cta).toBe('Read')
  })

  it('episode se publica como kind channel', () => {
    expect(toFeedBatchItem('p', entry({ contentType: 'episode' })).kind).toBe(
      'channel',
    )
  })

  it('displayTitle/displaySecondary ausentes pasan a null', () => {
    const item = toFeedBatchItem(
      'p',
      entry({ displayTitle: undefined, displaySecondary: undefined }),
    )

    expect(item.displayTitle).toBeNull()
    expect(item.displaySecondary).toBeNull()
  })
})
