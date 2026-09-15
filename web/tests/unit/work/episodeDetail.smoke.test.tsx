// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { EpisodeDetail } from '@/app/(public)/work/[slug]/EpisodeDetail'
import type { PublicContent } from '@/modules/content/infrastructure/publicContentSource'
import type { PublicEpisode } from '@/modules/content/infrastructure/publicEpisodeSource'

const CONTENT: PublicContent = {
  id: 'content-1',
  type: 'episode',
  slug: 'mi-episodio',
  defaultLocale: 'es',
  title: 'Mi episodio',
  seoTitle: null,
  seoDescription: null,
  summary: null,
  highlight: null,
  body: null,
  coverMedia: null,
}

describe('EpisodeDetail — prueba de humo', () => {
  afterEach(cleanup)

  it.each([
    ['youtube', 'abc123', 'https://www.youtube-nocookie.com/embed/abc123'],
    ['vimeo', 'xyz789', 'https://player.vimeo.com/video/xyz789'],
    ['spotify', 'ep456', 'https://open.spotify.com/embed/episode/ep456'],
  ] as const)(
    'embebe %s con la URL correcta (arquitectura §17.2)',
    (provider, embedId, expectedSrc) => {
      const episode: PublicEpisode = {
        provider,
        embedId,
        episodeKind: 'podcast',
      }
      render(<EpisodeDetail content={CONTENT} episode={episode} />)

      const iframe = screen.getByTitle('Mi episodio')
      expect(iframe).toHaveAttribute('src', expectedSrc)
    },
  )

  it('pinta el título y la etiqueta de tipo', () => {
    render(
      <EpisodeDetail
        content={CONTENT}
        episode={{
          provider: 'youtube',
          embedId: 'abc123',
          episodeKind: 'podcast',
        }}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Mi episodio' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Podcast')).toBeInTheDocument()
  })
})
