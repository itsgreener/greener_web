// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
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
 * Confirmado el 15 sep: con más de un medio (show_as_carousel), la
 * tarjeta sí recorre el carrusel de verdad — 5 s por slide de imagen, un
 * slide de vídeo avanza al terminar (evento 'ended'), sin flechas ni
 * puntos manuales. En hover: imagen fija, vídeo en loop. Al salir, se
 * reinicia el temporizador desde cero.
 */
describe('PinCard — carrusel (más de un medio)', () => {
  const CAROUSEL_PIN = {
    pinId: 'carousel-1',
    destination: '/work/caso-carrusel',
    ratio: '1:1',
    label: 'Carrusel',
    cta: null,
    alt: 'Alt del carrusel',
    autoplayMode: null,
  }

  beforeEach(() => {
    vi.useFakeTimers()

    // useVideoSlot (videoPlaybackCoordinator) necesita un
    // IntersectionObserver que sí llame al callback — a diferencia del
    // stub no-op de más abajo (MasonryFeed), aquí hace falta un ratio de
    // visibilidad real para que el slot se conceda.
    // @ts-expect-error -- stub mínimo suficiente para el smoke test
    global.IntersectionObserver = class {
      callback: IntersectionObserverCallback
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback
      }
      observe(target: Element) {
        this.callback(
          [
            {
              intersectionRatio: 1,
              boundingClientRect: { top: 0, bottom: 100 },
              target,
            } as IntersectionObserverEntry,
          ],
          this as unknown as IntersectionObserver,
        )
      }
      disconnect() {}
      unobserve() {}
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('con dos imágenes, avanza a la siguiente a los 5000ms', () => {
    render(
      <PinCard
        pin={{
          ...CAROUSEL_PIN,
          media: [
            { kind: 'image', cloudinaryPublicId: 'img-1' },
            { kind: 'image', cloudinaryPublicId: 'img-2' },
          ],
        }}
        style={{ x: 0, y: 0, width: 300, height: 300 }}
      />,
    )

    expect(screen.getByAltText('Alt del carrusel')).toHaveAttribute(
      'src',
      expect.stringContaining('img-1'),
    )

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.getByAltText('Alt del carrusel')).toHaveAttribute(
      'src',
      expect.stringContaining('img-2'),
    )
  })

  it('en hover, no avanza aunque pase el tiempo — al salir, se reinicia desde cero', () => {
    render(
      <PinCard
        pin={{
          ...CAROUSEL_PIN,
          media: [
            { kind: 'image', cloudinaryPublicId: 'img-1' },
            { kind: 'image', cloudinaryPublicId: 'img-2' },
          ],
        }}
        style={{ x: 0, y: 0, width: 300, height: 300 }}
      />,
    )

    const link = screen.getByRole('link')
    fireEvent.mouseEnter(link)

    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(screen.getByAltText('Alt del carrusel')).toHaveAttribute(
      'src',
      expect.stringContaining('img-1'),
    )

    fireEvent.mouseLeave(link)

    // Recién salido del hover, todavía no han pasado los 5000ms nuevos.
    act(() => {
      vi.advanceTimersByTime(4999)
    })
    expect(screen.getByAltText('Alt del carrusel')).toHaveAttribute(
      'src',
      expect.stringContaining('img-1'),
    )

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByAltText('Alt del carrusel')).toHaveAttribute(
      'src',
      expect.stringContaining('img-2'),
    )
  })

  it('un slide de vídeo avanza cuando el vídeo termina (evento "ended"), no por el timer de 5000ms', () => {
    render(
      <PinCard
        pin={{
          ...CAROUSEL_PIN,
          media: [
            { kind: 'video', cloudinaryPublicId: 'clip-1' },
            { kind: 'image', cloudinaryPublicId: 'img-2' },
          ],
        }}
        style={{ x: 0, y: 0, width: 300, height: 300 }}
      />,
    )

    const video = document.querySelector('video') as HTMLVideoElement
    expect(video).toBeInTheDocument()

    // El vídeo ya está listo y suena (jsdom no dispara estos eventos solo):
    // contrato de medios §6.3, el vídeo avanza por 'ended' solo cuando
    // de verdad se reproduce.
    Object.defineProperty(video, 'readyState', {
      value: 4,
      configurable: true,
    })
    act(() => {
      fireEvent(video, new Event('canplay'))
      fireEvent(video, new Event('playing'))
    })

    // El timer de 5000ms no debe hacer avanzar un slide de vídeo que suena.
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(document.querySelector('video')).toBeInTheDocument()

    fireEvent(video, new Event('ended'))

    expect(document.querySelector('video')).not.toBeInTheDocument()
    expect(screen.getByAltText('Alt del carrusel')).toHaveAttribute(
      'src',
      expect.stringContaining('img-2'),
    )
  })

  it('un slide de vídeo que NO llega a reproducirse (aún cargando o fallando) avanza por el timer: el carrusel nunca se queda parado', () => {
    render(
      <PinCard
        pin={{
          ...CAROUSEL_PIN,
          media: [
            { kind: 'video', cloudinaryPublicId: 'clip-1' },
            { kind: 'image', cloudinaryPublicId: 'img-2' },
          ],
        }}
        style={{ x: 0, y: 0, width: 300, height: 300 }}
      />,
    )

    // Sin evento 'playing': el vídeo está montado pero oculto bajo el póster.
    expect(document.querySelector('video')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.getByAltText('Alt del carrusel')).toHaveAttribute(
      'src',
      expect.stringContaining('img-2'),
    )
  })

  it('en hover sobre un slide de vídeo, entra en loop y el evento "ended" no avanza', () => {
    render(
      <PinCard
        pin={{
          ...CAROUSEL_PIN,
          media: [
            { kind: 'video', cloudinaryPublicId: 'clip-1' },
            { kind: 'image', cloudinaryPublicId: 'img-2' },
          ],
        }}
        style={{ x: 0, y: 0, width: 300, height: 300 }}
      />,
    )

    const link = screen.getByRole('link')
    const video = document.querySelector('video') as HTMLVideoElement

    fireEvent.mouseEnter(link)
    expect(video.loop).toBe(true)

    fireEvent(video, new Event('ended'))

    // Sigue en el mismo slide de vídeo — el hover impide el avance.
    expect(document.querySelector('video')).toBeInTheDocument()

    fireEvent.mouseLeave(link)
    expect(video.loop).toBe(false)
  })

  it('con un único medio (sin carrusel), no monta ningún <video> aunque sea de tipo vídeo — ver el test de arriba, "un medio de vídeo usa el poster"', () => {
    render(
      <PinCard
        pin={{
          ...CAROUSEL_PIN,
          media: [{ kind: 'video', cloudinaryPublicId: 'clip-1' }],
        }}
        style={{ x: 0, y: 0, width: 300, height: 300 }}
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
