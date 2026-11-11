// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { PinCard } from '@/components/pin/PinCard'

describe('PinCard — prueba de humo', () => {
  it('renderiza sin lanzar, con la imagen, el alt y el enlace correctos', () => {
    render(
      <PinCard
        pin={{
          pinId: 'p1',
          destination: '/work/mi-caso',
          ratio: '4:5',
          label: 'Mi caso',
          cta: 'Ver caso',
          alt: 'Texto alternativo',
          autoplayMode: null,
          media: [{ kind: 'image', cloudinaryPublicId: 'sample' }],
        }}
        style={{ x: 0, y: 0, width: 300, height: 375 }}
      />,
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/work/mi-caso')
    expect(screen.getByAltText('Texto alternativo')).toBeInTheDocument()
    expect(screen.getByText('Mi caso')).toBeInTheDocument()
    expect(screen.getByText('Ver caso')).toBeInTheDocument()
  })

  it('sin label (caso/episodio, especificacion-final-formato-detalle.md §3), no renderiza el párrafo de rótulo', () => {
    const { container } = render(
      <PinCard
        pin={{
          pinId: 'p2',
          destination: '/work/otro-caso',
          ratio: '1:1',
          label: null,
          cta: 'Watch',
          alt: 'Alt sin rótulo',
          autoplayMode: null,
          media: [{ kind: 'image', cloudinaryPublicId: 'sample' }],
        }}
        style={{ x: 0, y: 0, width: 300, height: 300 }}
      />,
    )

    expect(screen.queryByText('Watch')).toBeInTheDocument()
    expect(container.querySelector('p')).not.toBeInTheDocument()
  })

  it('un medio de vídeo usa el poster, no el vídeo completo — sin autoplay en esta primera versión', () => {
    render(
      <PinCard
        pin={{
          pinId: 'p3',
          destination: '/work/caso-video',
          ratio: '9:16',
          label: 'Con vídeo',
          cta: null,
          alt: 'Alt de vídeo',
          autoplayMode: null,
          media: [{ kind: 'video', cloudinaryPublicId: 'sample-video' }],
        }}
        style={{ x: 0, y: 0, width: 300, height: 533 }}
      />,
    )

    const img = screen.getByAltText('Alt de vídeo')
    expect(img).toHaveAttribute('src', expect.stringContaining('.jpg'))
    expect(document.querySelector('video')).not.toBeInTheDocument()
  })
})

/**
 * 7 oct 2026 (§2.41): un pin es un único medio y su tarjeta no avanza nunca.
 * La única excepción es el carrusel de pines de un episodio (11 nov 2026,
 * §2.150), que llega como una unidad con varios medios y tiene sus propios
 * tests (tests/unit/pin/pinCarouselCard.test.tsx).
 */
describe('PinCard — un pin es un único medio (sin carrusel)', () => {
  const PIN = {
    pinId: 'pin-1',
    destination: '/work/caso',
    ratio: '1:1',
    label: 'Pin',
    cta: null,
    alt: 'Alt del pin',
    autoplayMode: null,
  }
  const STYLE = { x: 0, y: 0, width: 300, height: 300 }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('el destino de una tool no lleva ningún parámetro slide', () => {
    render(
      <PinCard
        pin={{
          ...PIN,
          destination: '/tools/mi-tool?pin=pin-1',
          media: [{ kind: 'image', cloudinaryPublicId: 'imagen-1' }],
        }}
        style={STYLE}
      />,
    )

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/tools/mi-tool?pin=pin-1',
    )
  })

  it('un medio de vídeo sin autoplay no monta ningún <video>', () => {
    render(
      <PinCard
        pin={{
          ...PIN,
          media: [{ kind: 'video', cloudinaryPublicId: 'clip-1' }],
        }}
        style={STYLE}
      />,
    )

    expect(document.querySelector('video')).not.toBeInTheDocument()
  })
})
