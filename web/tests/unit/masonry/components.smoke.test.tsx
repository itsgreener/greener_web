// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MasonryFeed } from '@/components/masonry/MasonryFeed'
import { PinCard } from '@/components/pin/PinCard'
import type { FeedBatchResult } from '@/modules/feed/application/getDemoFeedBatch'

function fakeBatch(offset: number, count: number): FeedBatchResult {
  return {
    items: Array.from({ length: count }, (_, i) => ({
      pinId: `pin-${offset + i}`,
      contentId: `case-${offset + i}`,
      kind: 'case',
      destination: `/work/case-${offset + i}`,
      ratio: '1:1',
      label: `Pin ${offset + i}`,
      cta: 'Ver caso',
      alt: `Alt del pin ${offset + i}`,
      cloudinaryPublicId: 'sample',
      relaxationLevel: 0,
    })),
    nextOffset: offset + count,
    hasMore: true,
  }
}

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
 * 7 oct 2026 (§2.41): un pin es un único medio y no existe el carrusel de
 * pines. Si por datos antiguos llegaran varios medios, la tarjeta pinta el
 * primero y no avanza nunca.
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

  it('con varios medios en los datos pinta solo el primero y no avanza con el tiempo', () => {
    render(
      <PinCard
        pin={{
          ...PIN,
          media: [
            { kind: 'image', cloudinaryPublicId: 'imagen-1' },
            { kind: 'image', cloudinaryPublicId: 'imagen-2' },
          ],
        }}
        style={STYLE}
      />,
    )

    const img = screen.getByAltText('Alt del pin')
    expect(img).toHaveAttribute('src', expect.stringContaining('imagen-1'))

    act(() => {
      vi.advanceTimersByTime(30_000)
    })

    expect(screen.getByAltText('Alt del pin')).toHaveAttribute(
      'src',
      expect.stringContaining('imagen-1'),
    )
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

describe('MasonryFeed — prueba de humo', () => {
  beforeEach(() => {
    // ResizeObserver e IntersectionObserver no existen en jsdom.
    // @ts-expect-error -- stub mínimo suficiente para el smoke test
    global.ResizeObserver = class {
      observe() {}
      disconnect() {}
    }
    // @ts-expect-error -- stub mínimo suficiente para el smoke test
    global.IntersectionObserver = class {
      observe() {}
      disconnect() {}
    }

    global.fetch = vi.fn(async (url: string) => {
      const u = new URL(url, 'http://localhost')
      const offset = Number(u.searchParams.get('offset') ?? '0')
      const count = Number(u.searchParams.get('count') ?? '40')
      return {
        ok: true,
        json: async () => fakeBatch(offset, count),
      } as Response
    }) as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('monta sin lanzar y acaba pidiendo y renderizando el primer lote', async () => {
    render(<MasonryFeed />)

    await waitFor(() => {
      expect(screen.getByText('40 pines cargados')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('offset=0'),
    )
  })
})
