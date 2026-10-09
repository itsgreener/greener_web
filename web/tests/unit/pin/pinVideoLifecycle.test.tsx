// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { PinCard, type PinCardData } from '@/components/pin/PinCard'

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

  it('un canplay con readyState < 3 no cuenta como listo', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)
    const video = q(container)!

    Object.defineProperty(video, 'readyState', { value: 2, configurable: true })
    act(() => {
      fireEvent(video, new Event('canplay'))
    })

    expect(playSpy).not.toHaveBeenCalled()
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

    it('el hover es una acción explícita: sigue funcionando aunque haya reduced-motion', () => {
      stubMatchMedia(true)
      const { container } = render(
        <PinCard pin={pin({ autoplayMode: 'hover' })} style={STYLE} />,
      )

      expect(q(container)).not.toBeInTheDocument()

      act(() => {
        fireEvent.mouseEnter(container.querySelector('a')!)
      })

      expect(q(container)).toBeInTheDocument()
    })
  })

  it('un pin de vídeo con autoplay desactivado (null) no hace prefetch: no gasta ancho de banda', () => {
    const { container } = render(
      <PinCard pin={pin({ autoplayMode: null })} style={STYLE} />,
    )

    expect(q(container)).not.toBeInTheDocument()
  })

  it('un pin con modo hover SÍ hace prefetch para que el hover arranque sin espera', () => {
    const { container } = render(
      <PinCard pin={pin({ autoplayMode: 'hover' })} style={STYLE} />,
    )

    expect(q(container)).toBeInTheDocument()
    expect(playSpy).not.toHaveBeenCalled()
  })
})
