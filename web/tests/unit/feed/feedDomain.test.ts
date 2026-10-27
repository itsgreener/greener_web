import { describe, expect, it } from 'vitest'

import { UnsupportedScopeError } from '@/modules/feed/domain/feedErrors'
import { toFeedBatchItem } from '@/modules/feed/domain/feedItemPresentation'
import type { PinDirectoryEntry } from '@/modules/feed/domain/feedReadModels'
import {
  CONTENT_TYPE_TO_KIND,
  FEED_SCOPES,
  isFeedScope,
  parseFeedScope,
  typesForScope,
  type FeedScope,
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

  it('un scope desconocido no se reconoce como scope', () => {
    expect(isFeedScope('nope')).toBe(false)
    expect(isFeedScope('toString')).toBe(false)
    expect(isFeedScope('related-cases')).toBe(false)
  })

  it('un scope con un espacio de más tampoco vale (no cae en home)', () => {
    expect(isFeedScope('work ')).toBe(false)
  })

  it('los cinco scopes conocidos son exactamente FEED_SCOPES', () => {
    expect([...FEED_SCOPES].sort()).toEqual(
      ['channel', 'home', 'insights', 'tools', 'work'].sort(),
    )

    for (const scope of FEED_SCOPES) {
      expect(isFeedScope(scope)).toBe(true)
      expect(parseFeedScope(scope)).toBe(scope)
    }
  })

  it('typesForScope y parseFeedScope fallan con un scope desconocido en vez de caer en home', () => {
    expect(() => typesForScope('nope' as FeedScope)).toThrow(
      UnsupportedScopeError,
    )
    expect(() => parseFeedScope('nope')).toThrow(UnsupportedScopeError)
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

  it('other: abre directamente su página satélite y el CTA es «Upload your CV»', () => {
    const item = toFeedBatchItem(
      'p',
      entry({ contentType: 'other', contentSlug: 'mi-pagina' }),
    )

    expect(item.destination).toBe('/variety/mi-pagina/app')
    expect(item.cta).toBe('Upload your CV')
  })

  it.each([
    ['en', 'Upload your CV'],
    ['es', 'Sube tu portfolio'],
    ['ca', 'Puja el teu CV'],
    [undefined, 'Upload your CV'],
    ['fr', 'Upload your CV'],
  ])(
    'other: el CTA sigue el idioma del pin (%s -> %s) y cae al inglés',
    (language, cta) => {
      const item = toFeedBatchItem(
        'p',
        entry({ contentType: 'other', contentSlug: 'talent', language }),
      )

      expect(item.cta).toBe(cta)
    },
  )

  it('el idioma del pin no cambia el CTA de los demás tipos', () => {
    expect(
      toFeedBatchItem('p', entry({ contentType: 'tool', language: 'es' })).cta,
    ).toBe('Use')
    expect(
      toFeedBatchItem('p', entry({ contentType: 'insight', language: 'ca' }))
        .cta,
    ).toBe('Read')
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
