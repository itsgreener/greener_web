// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * Carrusel de pines de episodio en el feed (§2.150): una tarjeta con varias
 * diapositivas que avanza sola, se pausa al mirarla y se desliza con el dedo.
 */

const trackAnalyticsEvent = vi.fn()

vi.mock('@/modules/analytics/analytics', () => ({
  trackAnalyticsEvent: (...args: unknown[]) => trackAnalyticsEvent(...args),
}))

import {
  PinCard,
  type PinCardData,
  type PinMediaData,
} from '@/components/pin/PinCard'
import {
  CAROUSEL_IMAGE_MS,
  CAROUSEL_STAGGER_MAX_MS,
  carouselStaggerMs,
} from '@/modules/feed/domain/carouselTiming'
import { HOVER_INTENT_MS } from '@/modules/media/domain/videoPlayback'

const STYLE = { x: 0, y: 0, width: 300, height: 375 }

function slides(
  count: number,
  overrides: Record<number, object> = {},
): PinMediaData[] {
  return Array.from({ length: count }, (_, i) => ({
    kind: 'image' as const,
    cloudinaryPublicId: `slide-${i}`,
    alt: `Alt ${i}`,
    autoplayMode: null,
    ...overrides[i],
  }))
}

function pin(media = slides(3)): PinCardData {
  return {
    pinId: 'head-pin',
    destination: '/channel/mi-episodio',
    ratio: '4:5',
    label: null,
    displayTitle: 'Mi episodio',
    displaySecondary: 'Podcast',
    cta: 'Watch',
    alt: 'Alt del pin',
    autoplayMode: null,
    media,
  }
}

function stubMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: reduced,
    addEventListener: () => {},
    removeEventListener: () => {},
  })
}

/** Las diapositivas (hijos directos de la pista) y cuál está a la vista. */
function slideEls(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>('a > div > div > div'),
  )
}

function visibleIndex(container: HTMLElement) {
  return slideEls(container).findIndex(
    (el) => el.getAttribute('aria-hidden') !== 'true',
  )
}

const FIRST_ADVANCE = CAROUSEL_IMAGE_MS + CAROUSEL_STAGGER_MAX_MS

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  stubMatchMedia(false)
  Object.defineProperty(navigator, 'connection', {
    value: undefined,
    configurable: true,
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PinCard — carrusel de pines (§2.150)', () => {
  it('con varios medios pinta una sola tarjeta con enlace al episodio y su pie', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)

    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/channel/mi-episodio',
    )
    expect(screen.getByText('Mi episodio')).toBeVisible()
    expect(slideEls(container)).toHaveLength(3)
  })

  it('solo la diapositiva activa es legible y cada una lleva su propio alt', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)

    expect(visibleIndex(container)).toBe(0)
    expect(screen.getByAltText('Alt 0')).toBeInTheDocument()
    expect(screen.getByAltText('Alt 1')).toBeInTheDocument()
    expect(screen.getByAltText('Alt 0').closest('[aria-hidden]')).toBeNull()
    expect(
      screen.getByAltText('Alt 1').closest('[aria-hidden="true"]'),
    ).not.toBeNull()
  })

  it('una diapositiva sin alt propio usa el del pin', () => {
    render(
      <PinCard
        pin={pin([
          { kind: 'image', cloudinaryPublicId: 'a' },
          { kind: 'image', cloudinaryPublicId: 'b' },
        ])}
        style={STYLE}
      />,
    )

    expect(screen.getAllByAltText('Alt del pin').length).toBeGreaterThan(0)
  })

  it('solo pide la anterior, la activa y la siguiente (las demás son huecos vacíos)', () => {
    const { container } = render(<PinCard pin={pin(slides(6))} style={STYLE} />)

    const loaded = slideEls(container).map((el) => !!el.querySelector('img'))

    // Activa = 0: carga la 0, la 1 y la última (el carrusel da la vuelta).
    expect(loaded).toEqual([true, true, false, false, false, true])
  })

  it('avanza sola tras el tiempo de una imagen y respeta el desfase de arranque', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)

    act(() => {
      vi.advanceTimersByTime(CAROUSEL_IMAGE_MS - 1)
    })
    expect(visibleIndex(container)).toBe(0)

    act(() => {
      vi.advanceTimersByTime(FIRST_ADVANCE)
    })
    expect(visibleIndex(container)).toBe(1)
  })

  it('al llegar a la última vuelve a la primera y sigue sin fin', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)

    act(() => {
      vi.advanceTimersByTime(FIRST_ADVANCE)
    })
    act(() => {
      vi.advanceTimersByTime(CAROUSEL_IMAGE_MS)
    })
    expect(visibleIndex(container)).toBe(2)

    act(() => {
      vi.advanceTimersByTime(CAROUSEL_IMAGE_MS)
    })
    expect(visibleIndex(container)).toBe(0)

    act(() => {
      vi.advanceTimersByTime(CAROUSEL_IMAGE_MS)
    })
    expect(visibleIndex(container)).toBe(1)
  })

  it('se detiene con el puntero encima (tras la intención de hover) y sigue al salir', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)
    const link = screen.getByRole('link')

    fireEvent.mouseEnter(link)
    act(() => {
      vi.advanceTimersByTime(HOVER_INTENT_MS)
    })
    act(() => {
      vi.advanceTimersByTime(FIRST_ADVANCE * 3)
    })
    expect(visibleIndex(container)).toBe(0)

    fireEvent.mouseLeave(link)
    act(() => {
      vi.advanceTimersByTime(FIRST_ADVANCE)
    })
    expect(visibleIndex(container)).toBe(1)
  })

  it('se detiene con el foco del teclado en la tarjeta', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)

    fireEvent.focus(screen.getByRole('link'))
    act(() => {
      vi.advanceTimersByTime(FIRST_ADVANCE * 3)
    })

    expect(visibleIndex(container)).toBe(0)
  })

  it('con prefers-reduced-motion no se mueve sola', () => {
    stubMatchMedia(true)
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)

    act(() => {
      vi.advanceTimersByTime(FIRST_ADVANCE * 5)
    })

    expect(visibleIndex(container)).toBe(0)
  })

  it('con save-data no se mueve sola', () => {
    Object.defineProperty(navigator, 'connection', {
      value: { saveData: true },
      configurable: true,
    })
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)

    act(() => {
      vi.advanceTimersByTime(FIRST_ADVANCE * 5)
    })

    expect(visibleIndex(container)).toBe(0)
  })

  it('con la pestaña oculta no avanza y al volver a verse continúa', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    act(() => {
      vi.advanceTimersByTime(FIRST_ADVANCE * 3)
    })
    expect(visibleIndex(container)).toBe(0)

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    act(() => {
      vi.advanceTimersByTime(FIRST_ADVANCE)
    })
    expect(visibleIndex(container)).toBe(1)
  })

  it('un vídeo animable espera su duración (con el mínimo de una imagen)', () => {
    const { container } = render(
      <PinCard
        pin={pin(
          slides(2, {
            0: { kind: 'video', durationSeconds: 7 },
          }),
        )}
        style={STYLE}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(7000 + carouselStaggerMs('head-pin') - 1)
    })
    expect(visibleIndex(container)).toBe(0)

    act(() => {
      vi.advanceTimersByTime(2)
    })
    expect(visibleIndex(container)).toBe(1)
  })

  it('el evento Pin Click lleva el tipo de la diapositiva que se está viendo', () => {
    const { container } = render(
      <PinCard
        pin={pin(slides(2, { 1: { kind: 'video', durationSeconds: 5 } }))}
        style={STYLE}
        analyticsContext={{ section: 'home', destinationType: 'channel' }}
      />,
    )

    fireEvent.click(screen.getByRole('link'))
    expect(trackAnalyticsEvent).toHaveBeenLastCalledWith(
      'Pin Click',
      expect.objectContaining({ pinType: 'image' }),
      expect.anything(),
    )

    act(() => {
      vi.advanceTimersByTime(FIRST_ADVANCE)
    })
    expect(visibleIndex(container)).toBe(1)

    fireEvent.click(screen.getByRole('link'))
    expect(trackAnalyticsEvent).toHaveBeenLastCalledWith(
      'Pin Click',
      expect.objectContaining({ pinType: 'video' }),
      expect.anything(),
    )
  })

  it('un pin de un solo medio no es un carrusel: no avanza ni tiene diapositivas', () => {
    const { container } = render(<PinCard pin={pin(slides(1))} style={STYLE} />)

    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
    expect(screen.getAllByRole('img')).toHaveLength(1)
  })
})

describe('PinCard — deslizar el carrusel', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('la diapositiva visible sigue al scroll nativo de la pista', async () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)
    const track = container.querySelector<HTMLElement>('a > div > div')!

    Object.defineProperty(track, 'clientWidth', {
      value: 300,
      configurable: true,
    })
    track.scrollLeft = 300
    fireEvent.scroll(track)

    await vi.waitFor(() => expect(visibleIndex(container)).toBe(1))
  })
})
