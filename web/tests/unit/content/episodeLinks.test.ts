import { describe, expect, it } from 'vitest'
import {
  EPISODE_CTA_LABEL,
  episodeExternalUrl,
} from '@/modules/content/domain/episodeLinks'

describe('episodeExternalUrl — CTA «Watch more» (5 oct 2026)', () => {
  it('YouTube: enlace al vídeo, no al embed', () => {
    expect(episodeExternalUrl('youtube', 'dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    )
  })

  it('Vimeo: página del vídeo', () => {
    expect(episodeExternalUrl('vimeo', '123456789')).toBe(
      'https://vimeo.com/123456789',
    )
  })

  it('Spotify: página del episodio', () => {
    expect(episodeExternalUrl('spotify', '4rOoJ6Egrf8K2IrywzwOMk')).toBe(
      'https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk',
    )
  })

  it('escapa el id: un valor raro no puede inyectar parámetros ni cambiar la ruta', () => {
    expect(episodeExternalUrl('youtube', 'abc&evil=1')).toBe(
      'https://www.youtube.com/watch?v=abc%26evil%3D1',
    )
    expect(episodeExternalUrl('vimeo', '../admin')).toBe(
      'https://vimeo.com/..%2Fadmin',
    )
  })

  it('la etiqueta es «Watch more», la de la spec', () => {
    expect(EPISODE_CTA_LABEL).toBe('Watch more')
  })
})
