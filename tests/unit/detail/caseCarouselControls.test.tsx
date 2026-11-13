// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { CaseDetail } from '@/components/detail/CaseDetail'
import type {
  PublicCaseCarouselItem,
  PublicContent,
} from '@/modules/content/domain/publicContent'

/**
 * Controles del carrusel de un caso (10 nov 2026): un punto por diapositiva
 * que marca la visible y permite saltar, y scroll de una diapositiva por
 * gesto (también con una rueda/trackpad fuerte). Flechas anterior/siguiente
 * dentro de la imagen (13 nov 2026), que se ocultan en los extremos.
 */

const CONTENT: PublicContent = {
  id: 'c1',
  type: 'case',
  slug: 'mi-caso',
  defaultLocale: 'es',
  locale: 'es',
  availableLocales: ['es'],
  publishedAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-15T10:00:00.000Z',
  title: 'Mi caso',
  seoTitle: null,
  seoDescription: null,
  summary: null,
  highlight: null,
  body: null,
}

function item(index: number): PublicCaseCarouselItem {
  return {
    mediaId: `m${index}`,
    kind: 'image',
    cloudinaryPublicId: `casos/medio-${index}`,
    sortOrder: index,
    alt: `Medio ${index}`,
    width: 1920,
    height: 1080,
  }
}

const SLIDE_WIDTH = 800

/** El track con un `scrollLeft` y un `scrollTo` que se comportan como reales. */
function mountCarousel(count: number) {
  const { container } = render(
    <CaseDetail
      content={CONTENT}
      caseDetail={null}
      carousel={Array.from({ length: count }, (_, i) => item(i))}
    />,
  )
  const track = container.querySelector('[class*="track"]') as HTMLElement
  let scrollLeft = 0
  Object.defineProperty(track, 'scrollLeft', {
    get: () => scrollLeft,
    set: (value: number) => {
      scrollLeft = value
    },
    configurable: true,
  })
  const scrollTo = vi.fn((options: ScrollToOptions) => {
    scrollLeft = options.left ?? 0
  })
  track.scrollTo = scrollTo as unknown as typeof track.scrollTo
  return { track, scrollTo, setScrollLeft: (v: number) => (scrollLeft = v) }
}

let clock = 1000

function wheel(track: HTMLElement, init: { deltaX: number; deltaY?: number }) {
  const event = new WheelEvent('wheel', {
    deltaX: init.deltaX,
    deltaY: init.deltaY ?? 0,
    bubbles: true,
    cancelable: true,
  })
  Object.defineProperty(event, 'timeStamp', { value: clock })
  track.dispatchEvent(event)
  return event
}

beforeEach(() => {
  clock = 1000
  global.ResizeObserver = class {
    callback: ResizeObserverCallback
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
    }
    observe() {
      this.callback(
        [{ contentRect: { width: 1200 } } as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      )
    }
    disconnect() {}
    unobserve() {}
  }
  // @ts-expect-error -- stub mínimo suficiente
  global.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  }
  global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/feed/sessions' && init?.method === 'POST') {
      return { ok: true, json: async () => ({ sessionId: 's' }) } as Response
    }
    return {
      ok: true,
      json: async () => ({
        items: [],
        cursor: 'c',
        round: 0,
        batch: 0,
        hasMore: false,
      }),
    } as Response
  }) as typeof fetch
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(
    SLIDE_WIDTH,
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('puntos del carrusel', () => {
  it('pinta un punto por diapositiva y marca la primera', () => {
    mountCarousel(4)
    const dots = screen.getAllByRole('button', { name: /go to slide/i })

    expect(dots).toHaveLength(4)
    expect(dots[0]).toHaveAttribute('aria-current', 'true')
    expect(dots[1]).not.toHaveAttribute('aria-current')
    expect(dots[2]).toHaveAccessibleName('Go to slide 3 of 4')
  })

  it('con más de 7 diapositivas pinta solo 7 y la ventana sigue al activo', () => {
    mountCarousel(20)
    const labels = () =>
      screen
        .getAllByRole('button', { name: /go to slide/i })
        .map((dot) => dot.getAttribute('aria-label'))

    expect(labels()).toHaveLength(7)
    expect(labels()[0]).toBe('Go to slide 1 of 20')
    expect(labels()[6]).toBe('Go to slide 7 of 20')

    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 7 of 20' }))

    // Activo = diapositiva 7: la ventana pasa a ir de la 4 a la 10.
    expect(labels()[0]).toBe('Go to slide 4 of 20')
    expect(labels()[6]).toBe('Go to slide 10 of 20')
    expect(
      screen.getByRole('button', { name: 'Go to slide 7 of 20' }),
    ).toHaveAttribute('aria-current', 'true')
    expect(
      screen.getByRole('button', { name: 'Go to slide 4 of 20' }),
    ).toHaveAttribute('data-size', 'small')
  })

  it('con una sola diapositiva no pinta puntos', () => {
    mountCarousel(1)

    expect(screen.queryByRole('button', { name: /go to slide/i })).toBeNull()
  })

  it('pulsar un punto lleva a esa diapositiva y lo marca', () => {
    const { scrollTo } = mountCarousel(4)

    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 3 of 4' }))

    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ left: 2 * SLIDE_WIDTH }),
    )
    expect(
      screen.getByRole('button', { name: 'Go to slide 3 of 4' }),
    ).toHaveAttribute('aria-current', 'true')
    expect(
      screen.getByRole('button', { name: 'Go to slide 1 of 4' }),
    ).not.toHaveAttribute('aria-current')
  })

  it('el punto activo sigue al scroll nativo (táctil, trackpad)', async () => {
    const raf = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb) => {
        cb(0)
        return 1
      })
    const { track, setScrollLeft } = mountCarousel(4)

    await act(async () => {
      setScrollLeft(3 * SLIDE_WIDTH)
      track.dispatchEvent(new Event('scroll'))
    })

    expect(
      screen.getByRole('button', { name: 'Go to slide 4 of 4' }),
    ).toHaveAttribute('aria-current', 'true')
    raf.mockRestore()
  })
})

describe('flechas del carrusel', () => {
  const previous = () =>
    screen.queryByRole('button', { name: 'Previous slide' })
  const next = () => screen.queryByRole('button', { name: 'Next slide' })

  it('en la primera diapositiva solo hay flecha siguiente', () => {
    mountCarousel(4)

    expect(previous()).toBeNull()
    expect(next()).toBeInTheDocument()
  })

  it('con una sola diapositiva no pinta ninguna flecha', () => {
    mountCarousel(1)

    expect(previous()).toBeNull()
    expect(next()).toBeNull()
  })

  it('siguiente lleva a la diapositiva siguiente y la marca', () => {
    const { scrollTo } = mountCarousel(4)

    fireEvent.click(next()!)

    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ left: SLIDE_WIDTH }),
    )
    expect(
      screen.getByRole('button', { name: 'Go to slide 2 of 4' }),
    ).toHaveAttribute('aria-current', 'true')
    expect(previous()).toBeInTheDocument()
  })

  it('anterior vuelve atrás una diapositiva', () => {
    const { scrollTo } = mountCarousel(4)

    fireEvent.click(next()!)
    fireEvent.click(next()!)
    fireEvent.click(previous()!)

    expect(scrollTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ left: SLIDE_WIDTH }),
    )
  })

  it('dos pulsaciones seguidas avanzan dos diapositivas aunque la primera no haya llegado', () => {
    const { scrollTo } = mountCarousel(5)
    // El desplazamiento suave aún no ha movido nada.
    scrollTo.mockImplementation(() => undefined)

    fireEvent.click(next()!)
    fireEvent.click(next()!)

    expect(scrollTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ left: 2 * SLIDE_WIDTH }),
    )
  })

  it('en la última diapositiva desaparece la flecha siguiente', () => {
    mountCarousel(3)

    fireEvent.click(next()!)
    expect(next()).toBeInTheDocument()
    fireEvent.click(next()!)

    expect(next()).toBeNull()
    expect(previous()).toBeInTheDocument()
  })

  it('al volver a la primera desaparece la flecha anterior', () => {
    mountCarousel(2)

    fireEvent.click(next()!)
    fireEvent.click(previous()!)

    expect(previous()).toBeNull()
    expect(next()).toBeInTheDocument()
  })

  it('si la flecha pulsada desaparece, el foco pasa a la contraria', () => {
    mountCarousel(2)

    next()!.focus()
    fireEvent.click(next()!)
    expect(previous()).toHaveFocus()

    fireEvent.click(previous()!)
    expect(next()).toHaveFocus()
  })

  it('las flechas siguen al scroll nativo y a los puntos', async () => {
    const raf = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb) => {
        cb(0)
        return 1
      })
    const { track, setScrollLeft } = mountCarousel(3)

    await act(async () => {
      setScrollLeft(2 * SLIDE_WIDTH)
      track.dispatchEvent(new Event('scroll'))
    })

    expect(next()).toBeNull()
    expect(previous()).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 1 of 3' }))

    expect(previous()).toBeNull()
    expect(next()).toBeInTheDocument()
    raf.mockRestore()
  })

  it('el scroll intermedio de un desplazamiento pedido no hace parpadear el estado', async () => {
    const raf = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb) => {
        cb(0)
        return 1
      })
    const { track, scrollTo, setScrollLeft } = mountCarousel(2)
    scrollTo.mockImplementation(() => undefined)

    fireEvent.click(next()!)
    expect(next()).toBeNull()

    // A mitad de camino (menos de la mitad todavía) el scroll nativo dispara
    // eventos: la flecha siguiente no debe reaparecer.
    await act(async () => {
      setScrollLeft(SLIDE_WIDTH * 0.2)
      track.dispatchEvent(new Event('scroll'))
    })
    expect(next()).toBeNull()

    await act(async () => {
      setScrollLeft(SLIDE_WIDTH)
      track.dispatchEvent(new Event('scroll'))
    })
    expect(next()).toBeNull()
    expect(previous()).toBeInTheDocument()
    raf.mockRestore()
  })

  it('tocar el carrusel a mano interrumpe el destino pedido', async () => {
    const raf = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb) => {
        cb(0)
        return 1
      })
    const { track, scrollTo, setScrollLeft } = mountCarousel(3)
    scrollTo.mockImplementation(() => undefined)

    fireEvent.click(next()!)
    track.dispatchEvent(new Event('pointerdown'))

    await act(async () => {
      setScrollLeft(0)
      track.dispatchEvent(new Event('scroll'))
    })

    expect(previous()).toBeNull()
    raf.mockRestore()
  })
})

describe('una diapositiva por gesto de scroll', () => {
  it('un gesto horizontal fuerte mueve solo una diapositiva', () => {
    const { track, scrollTo } = mountCarousel(5)

    // Gesto con inercia: muchos eventos seguidos, cada uno a pocos ms.
    for (let i = 0; i < 20; i += 1) {
      const event = wheel(track, { deltaX: 120 })
      expect(event.defaultPrevented).toBe(true)
      clock += 16
    }

    expect(scrollTo).toHaveBeenCalledTimes(1)
    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ left: SLIDE_WIDTH }),
    )
  })

  it('un segundo gesto, pasada la pausa, mueve la siguiente', () => {
    const { track, scrollTo } = mountCarousel(5)

    wheel(track, { deltaX: 120 })
    clock += 1000
    wheel(track, { deltaX: 120 })

    expect(scrollTo).toHaveBeenCalledTimes(2)
    expect(scrollTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ left: 2 * SLIDE_WIDTH }),
    )
  })

  it('hacia la izquierda vuelve atrás y no pasa de la primera', () => {
    const { track, scrollTo } = mountCarousel(3)

    wheel(track, { deltaX: -120 })

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 0 }))
  })

  it('no pasa de la última diapositiva', () => {
    const { track, scrollTo } = mountCarousel(2)

    wheel(track, { deltaX: 120 })
    clock += 1000
    wheel(track, { deltaX: 120 })

    expect(scrollTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ left: SLIDE_WIDTH }),
    )
  })

  it('el scroll vertical de la rueda no se intercepta (la página baja)', () => {
    const { track, scrollTo } = mountCarousel(3)

    const event = wheel(track, { deltaX: 2, deltaY: 100 })

    expect(event.defaultPrevented).toBe(false)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('el ruido del trackpad (deltas minúsculos) no mueve nada', () => {
    const { track, scrollTo } = mountCarousel(3)

    wheel(track, { deltaX: 2 })

    expect(scrollTo).not.toHaveBeenCalled()
  })
})

describe('CSS del carrusel', () => {
  const css = readFileSync(
    'src/components/detail/CaseDetail/CaseCarousel.module.css',
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '')

  it('los puntos del borde de la ventana se encogen', () => {
    expect(css).toMatch(/data-size='small'\]::after\s*\{[^}]*scale\(0\.5\)/)
    expect(css).toMatch(/data-size='medium'\]::after\s*\{[^}]*scale\(0\.75\)/)
  })

  it('cada diapositiva es una parada obligatoria del snap', () => {
    expect(css).toMatch(/\.slide\s*\{[^}]*scroll-snap-stop:\s*always/)
  })

  it('las flechas son un círculo blanco con icono negro a media altura', () => {
    expect(css).toMatch(
      /\.arrow\s*\{[^}]*top:\s*50%[^}]*border-radius:\s*var\(--radius-pill\)[^}]*background:\s*var\(--color-bg\)[^}]*color:\s*var\(--color-text\)/,
    )
    expect(css).toMatch(/data-direction='previous'\]\s*\{[^}]*left:/)
    expect(css).toMatch(/data-direction='next'\]\s*\{[^}]*right:/)
  })

  it('el scroll horizontal no encadena con el navegador y no enseña barras', () => {
    expect(css).toMatch(/overscroll-behavior-x:\s*contain/)
    expect(css).toMatch(/scrollbar-width:\s*none/)
  })
})
