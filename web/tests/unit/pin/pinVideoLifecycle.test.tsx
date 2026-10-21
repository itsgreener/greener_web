// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { PinCard, type PinCardData } from '@/components/pin/PinCard'
import { HOVER_INTENT_MS } from '@/modules/media/domain/videoPlayback'

/**
 * Ciclo de vida del vídeo de un pin del feed (contrato de medios §6):
 * prefetch oculto bajo el póster, visible solo al estar listo y sonando,
 * tiempo máximo, reintentos y políticas de ahorro.
 */

const STYLE = { x: 0, y: 0, width: 300, height: 375 }

function pin(over: Partial<PinCardData> = {}): PinCardData {
  return {
    pinId: 'p1',
    destination: '/tools/t?pin=p1',
    ratio: '4:5',
    label: 'Gancho',
    cta: null,
    alt: 'Demo',
    autoplayMode: 'viewport',
    media: [{ kind: 'video', cloudinaryPublicId: 'vid', durationSeconds: 6 }],
    ...over,
  }
}

function stubMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: reduced,
    addEventListener: () => {},
    removeEventListener: () => {},
  })
}

function setConnection(value: object | undefined) {
  Object.defineProperty(navigator, 'connection', {
    value,
    configurable: true,
  })
}

const q = (c: HTMLElement) =>
  c.querySelector('video') as HTMLVideoElement | null
const sources = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('video source')).map((s) =>
    s.getAttribute('src'),
  )

let playSpy: ReturnType<typeof vi.spyOn>

describe('PinCard — vídeo del feed (fase 1 del contrato de medios)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    stubMatchMedia(false)
    setConnection(undefined)

    // IntersectionObserver que se declara visible nada más observar.
    global.IntersectionObserver = class {
      cb: IntersectionObserverCallback
      constructor(cb: IntersectionObserverCallback) {
        this.cb = cb
      }
      observe(target: Element) {
        this.cb(
          [
            {
              isIntersecting: true,
              intersectionRatio: 1,
              boundingClientRect: { top: 100, bottom: 400 },
              target,
            } as unknown as IntersectionObserverEntry,
          ],
          this as unknown as IntersectionObserver,
        )
      }
      disconnect() {}
      unobserve() {}
    } as unknown as typeof IntersectionObserver

    playSpy = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    setConnection(undefined)
  })

  function ready(video: HTMLVideoElement) {
    Object.defineProperty(video, 'readyState', { value: 4, configurable: true })
    act(() => {
      fireEvent(video, new Event('canplay'))
    })
  }

  it('el póster es siempre la capa de base: srcset 320/480/640 y `src` de escalera, nunca el ancho exacto de la tarjeta', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)
    const img = container.querySelector('img')!

    expect(img.getAttribute('src')).toContain('w_320,c_limit') // 300 px → 320
    expect(img.getAttribute('src')).not.toContain('w_300')
    expect(img.getAttribute('srcset')?.split(', ')).toHaveLength(3)
    expect(img.getAttribute('srcset')).not.toContain('w_960')
  })

  it('con la tarjeta cerca, monta el <video> OCULTO bajo el póster, con dos fuentes de ancho 480 y sin src propio', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)
    const video = q(container)!

    expect(video).toBeInTheDocument()
    expect(video.className).not.toContain('videoVisible')
    expect(video).toHaveAttribute('preload', 'auto')
    expect(video.hasAttribute('src')).toBe(false)
    expect(video.muted).toBe(true)
    expect(container.querySelector('img')).toBeInTheDocument()

    const srcs = sources(container)
    expect(srcs).toHaveLength(2)
    expect(srcs[0]).toContain('ac_none/c_limit,w_480/f_webm,vc_vp9')
    expect(srcs[1]).toContain('ac_none/c_limit,w_480/f_mp4,vc_h264')
  })

  it('no empieza a reproducir hasta estar listo (readyState ≥ 3), y solo entonces se hace visible al sonar', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)
    const video = q(container)!

    expect(playSpy).not.toHaveBeenCalled()

    ready(video)
    expect(playSpy).toHaveBeenCalled()
    // Listo y con orden de reproducir, pero aún sin fotogramas: sigue oculto.
    expect(video.className).not.toContain('videoVisible')

    act(() => {
      fireEvent(video, new Event('playing'))
    })
    expect(video.className).toContain('videoVisible')
  })

  it('un canplay con readyState 2 ya arranca la reproducción: no se espera al estado «listo»', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)
    const video = q(container)!

    Object.defineProperty(video, 'readyState', { value: 2, configurable: true })
    act(() => {
      fireEvent(video, new Event('canplay'))
    })

    expect(playSpy).toHaveBeenCalled()
  })

  it('si en 10 s no está listo, se aborta: se quita el <video> y queda el póster', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)

    act(() => {
      vi.advanceTimersByTime(9_999)
    })
    expect(q(container)).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(q(container)).not.toBeInTheDocument()
    expect(container.querySelector('img')).toBeInTheDocument()

    // Y no reintenta por su cuenta.
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(q(container)).not.toBeInTheDocument()
  })

  it('estar listo cancela el tiempo máximo', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)

    ready(q(container)!)
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(q(container)).toBeInTheDocument()
  })

  it('si fallan todas las fuentes reintenta a los 3 s con un <video> nuevo; el error de una sola fuente no cuenta', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)
    const first = q(container)!

    act(() => {
      fireEvent.error(container.querySelectorAll('video source')[0])
    })
    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    expect(q(container)).toBe(first)

    act(() => {
      fireEvent.error(container.querySelectorAll('video source')[1])
    })
    expect(q(container)).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    expect(q(container)).toBeInTheDocument()
    expect(q(container)).not.toBe(first)
  })

  it('un error del PROPIO vídeo (p. ej. fallo de decodificación) también reintenta', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)

    act(() => {
      fireEvent.error(q(container)!)
    })
    expect(q(container)).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    expect(q(container)).toBeInTheDocument()
  })

  it('tras dos reintentos fallidos se rinde y deja el póster', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)
    const fail = () =>
      act(() => {
        container
          .querySelectorAll('video source')
          .forEach((s) => fireEvent.error(s))
      })

    fail()
    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    fail()
    act(() => {
      vi.advanceTimersByTime(8_000)
    })
    fail()
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(q(container)).not.toBeInTheDocument()
  })

  it('libera el elemento al desmontar (load() para soltar la descarga)', () => {
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load')
    const { unmount } = render(<PinCard pin={pin()} style={STYLE} />)

    load.mockClear()
    unmount()

    expect(load).toHaveBeenCalled()
  })

  describe('políticas de ahorro (§6.4): póster fijo, sin prefetch ni autoplay', () => {
    it('prefers-reduced-motion', () => {
      stubMatchMedia(true)
      const { container } = render(<PinCard pin={pin()} style={STYLE} />)

      expect(q(container)).not.toBeInTheDocument()
    })

    it('save-data', () => {
      setConnection({ saveData: true })
      const { container } = render(<PinCard pin={pin()} style={STYLE} />)

      expect(q(container)).not.toBeInTheDocument()
    })

    it('conexión 2G', () => {
      setConnection({ effectiveType: '2g' })
      const { container } = render(<PinCard pin={pin()} style={STYLE} />)

      expect(q(container)).not.toBeInTheDocument()
    })

    it('downlink por debajo de 1,5 Mbps', () => {
      setConnection({ downlink: 1.2 })
      const { container } = render(<PinCard pin={pin()} style={STYLE} />)

      expect(q(container)).not.toBeInTheDocument()
    })

    it('carrusel con un slide de vídeo: tampoco', () => {
      stubMatchMedia(true)
      const { container } = render(
        <PinCard
          pin={pin({
            media: [
              { kind: 'video', cloudinaryPublicId: 'a', durationSeconds: 5 },
              { kind: 'image', cloudinaryPublicId: 'b' },
            ],
          })}
          style={STYLE}
        />,
      )

      expect(q(container)).not.toBeInTheDocument()
    })

    it('el hover tampoco reproduce con reduced-motion: póster fijo', () => {
      stubMatchMedia(true)
      const { container } = render(
        <PinCard pin={pin({ autoplayMode: 'hover' })} style={STYLE} />,
      )

      act(() => {
        fireEvent.mouseEnter(container.querySelector('a')!)
        vi.advanceTimersByTime(HOVER_INTENT_MS + 50)
      })

      expect(q(container)).not.toBeInTheDocument()
    })

    it('el hover tampoco reproduce con save-data ni con conexión lenta', () => {
      for (const connection of [
        { saveData: true },
        { effectiveType: '2g' },
        { downlink: 0.5 },
      ]) {
        setConnection(connection)
        const { container, unmount } = render(
          <PinCard pin={pin({ autoplayMode: 'hover' })} style={STYLE} />,
        )

        act(() => {
          fireEvent.mouseEnter(container.querySelector('a')!)
          vi.advanceTimersByTime(HOVER_INTENT_MS + 50)
        })

        expect(q(container)).not.toBeInTheDocument()
        unmount()
      }
    })
  })

  it('un pin de vídeo con autoplay desactivado (null) no hace prefetch: no gasta ancho de banda', () => {
    const { container } = render(
      <PinCard pin={pin({ autoplayMode: null })} style={STYLE} />,
    )

    expect(q(container)).not.toBeInTheDocument()
  })

  describe('modo hover: intención de hover y sin prefetch (plan de pendientes, A3)', () => {
    function renderHover() {
      const view = render(
        <PinCard pin={pin({ autoplayMode: 'hover' })} style={STYLE} />,
      )

      return { ...view, link: view.container.querySelector('a')! }
    }

    it('un pin hover NO hace prefetch: no hay <video> hasta que haya intención', () => {
      const { container } = renderHover()

      expect(q(container)).not.toBeInTheDocument()
    })

    it('un paso circunstancial del puntero (sale antes de 200 ms) no monta ni descarga nada', () => {
      const { container, link } = renderHover()

      act(() => {
        fireEvent.mouseEnter(link)
        vi.advanceTimersByTime(HOVER_INTENT_MS - 50)
        fireEvent.mouseLeave(link)
        vi.advanceTimersByTime(1000)
      })

      expect(q(container)).not.toBeInTheDocument()
    })

    it('con el puntero encima monta el vídeo sin esperar (intención de 0 ms) y, al estar listo, lo reproduce', () => {
      const { container, link } = renderHover()

      act(() => {
        fireEvent.mouseEnter(link)
        vi.advanceTimersByTime(0)
      })
      expect(q(container)).toBeInTheDocument()

      ready(q(container)!)
      expect(playSpy).toHaveBeenCalled()
    })

    it('al salir se quita el vídeo de inmediato', () => {
      const { container, link } = renderHover()

      act(() => {
        fireEvent.mouseEnter(link)
        vi.advanceTimersByTime(HOVER_INTENT_MS)
      })
      expect(q(container)).toBeInTheDocument()

      act(() => {
        fireEvent.mouseLeave(link)
      })
      expect(q(container)).not.toBeInTheDocument()
    })

    it('el foco de teclado es inmediato, sin esperar', () => {
      const { container, link } = renderHover()

      act(() => {
        fireEvent.focus(link)
      })

      expect(q(container)).toBeInTheDocument()
    })
  })

  it('un pin en modo viewport sí hace prefetch', () => {
    const { container } = render(
      <PinCard pin={pin({ autoplayMode: 'viewport' })} style={STYLE} />,
    )

    expect(q(container)).toBeInTheDocument()
    expect(playSpy).not.toHaveBeenCalled()
  })
})
