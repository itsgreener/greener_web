import { describe, expect, it } from 'vitest'

import {
  embedProviderLabel,
  episodeEmbedKey,
  episodeEmbedUrl,
} from '@/modules/content/domain/episodeEmbed'

describe('episodeEmbedUrl', () => {
  it('YouTube: dominio sin cookies y autoplay', () => {
    expect(episodeEmbedUrl('youtube', 'abc123')).toBe(
      'https://www.youtube-nocookie.com/embed/abc123?autoplay=1',
    )
  })

  it('Spotify: embed de episodio y sin parámetro de autoplay', () => {
    expect(episodeEmbedUrl('spotify', 'xyz789')).toBe(
      'https://open.spotify.com/embed/episode/xyz789',
    )
  })

  it('YouTube nunca usa el dominio con cookies', () => {
    expect(episodeEmbedUrl('youtube', 'a')).not.toContain('www.youtube.com')
  })
})

describe('embedProviderLabel', () => {
  it('da el nombre de cada proveedor', () => {
    expect(embedProviderLabel('youtube')).toBe('YouTube')
    expect(embedProviderLabel('spotify')).toBe('Spotify')
  })
})

describe('episodeEmbedKey', () => {
  it('une proveedor e id', () => {
    expect(episodeEmbedKey('youtube', 'abc')).toBe('youtube:abc')
  })

  it('distingue el mismo id en dos proveedores y dos ids en uno', () => {
    expect(episodeEmbedKey('youtube', 'abc')).not.toBe(
      episodeEmbedKey('spotify', 'abc'),
    )
    expect(episodeEmbedKey('youtube', 'abc')).not.toBe(
      episodeEmbedKey('youtube', 'abd'),
    )
  })
})
