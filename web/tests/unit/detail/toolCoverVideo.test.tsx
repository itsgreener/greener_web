// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ToolInsightDetail } from '@/components/detail/ToolInsightDetail'
import { ToolCoverVideo } from '@/components/detail/ToolCoverVideo'
import { videoPlaybackCoordinator } from '@/components/pin/videoPlaybackCoordinator'
import type { PublicContent } from '@/modules/content/infrastructure/publicContentSource'

const BASE: PublicContent = {
  id: 'content-1',
  type: 'tool',
  slug: 'mi-tool',
  defaultLocale: 'es',
  locale: 'es',
  availableLocales: ['es'],
  title: 'Mi tool',
  seoTitle: null,
  seoDescription: null,
  summary: 'Resumen',
  highlight: null,
  body: null,
  coverMedia: null,
  coverRatio: null,
}

type IOEntry = { isIntersecting: boolean }
let ioCallbacks: Array<(entries: IOEntry[]) => void> = []
let playSpy: ReturnType<typeof vi.spyOn>
let pauseSpy: ReturnType<typeof vi.spyOn>

function stubMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: reduced,
    addEventListener: () => {},
    removeEventListener: () => {},
  })
}

const BOX = { ratio: '16:9', boxWidthPx: 500, boxHeightPx: 281 } as const

function setDpr(value: number) {
  Object.defineProperty(window, 'devicePixelRatio', {
    value,
    configurable: true,
  })
}

function sourcesOf(container: HTMLElement) {
  return Array.from(container.querySelectorAll('video source')).map((s) => ({
    src: s.getAttribute('src'),
    type: s.getAttribute('type'),
  }))
}

describe('ToolCoverVideo — vídeo de la ficha de una tool (5 oct 2026; contrato de medios 7 oct)', () => {
  beforeEach(() => {
    ioCallbacks = []

    global.IntersectionObserver = class {
      constructor(cb: (entries: IOEntry[]) => void) {
        ioCallbacks.push(cb)
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    } as unknown as typeof IntersectionObserver

    playSpy = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)
    pauseSpy = vi
      .spyOn(HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})

    setDpr(1)
    stubMatchMedia(false)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    setDpr(1)
  })

  it('pinta un <video> mudo, en bucle, con alt accesible y DOS fuentes explícitas (WebM/VP9 y MP4/H.264), sin f_auto', () => {
    const { container } = render(
      <ToolCoverVideo
        publicId="greener/content/videos/demo"
        alt="Cómo se usa"
        {...BOX}
      />,
    )

    const video = container.querySelector('video')!

    expect(video.muted).toBe(true)
    expect(video.loop).toBe(true)
    expect(video).toHaveAttribute('aria-label', 'Cómo se usa')
    expect(video.hasAttribute('controls')).toBe(false)
    expect(video.hasAttribute('src')).toBe(false)

    expect(sourcesOf(container)).toEqual([
      {
        src: 'https://res.cloudinary.com/test-cloud/video/upload/ac_none/c_limit,w_1280,h_720/f_webm,vc_vp9/q_auto/greener/content/videos/demo',
        type: 'video/webm; codecs="vp9"',
      },
      {
        src: 'https://res.cloudinary.com/test-cloud/video/upload/ac_none/c_limit,w_1280,h_720/f_mp4,vc_h264/q_auto/greener/content/videos/demo',
        type: 'video/mp4',
      },
    ])
  })

  it('el póster es un JPG con el tamaño del escalón (no un 960 genérico)', () => {
    const { container } = render(
      <ToolCoverVideo publicId="v" alt="x" {...BOX} />,
    )

    expect(container.querySelector('video')).toHaveAttribute(
      'poster',
      'https://res.cloudinary.com/test-cloud/video/upload/q_auto,f_jpg,w_1280,h_720,c_limit/v.jpg',
    )
  })

  it('caja de monitor 1080p (1126×634, DPR 1) → escalón M', () => {
    const { container } = render(
      <ToolCoverVideo
        publicId="v"
        alt="x"
        ratio="16:9"
        boxWidthPx={1126}
        boxHeightPx={634}
      />,
    )

    expect(sourcesOf(container)[0].src).toContain('c_limit,w_1280,h_720')
  })

  it('caja de MacBook (878×494, DPR 2) → escalón L, y el póster también es L', () => {
    setDpr(2)

    const { container } = render(
      <ToolCoverVideo
        publicId="v"
        alt="x"
        ratio="16:9"
        boxWidthPx={878}
        boxHeightPx={494}
      />,
    )

    expect(sourcesOf(container)[0].src).toContain('c_limit,w_1600,h_900')
    expect(container.querySelector('video')?.getAttribute('poster')).toContain(
      'w_1600,h_900',
    )
  })

  it('un vídeo vertical (9:16) usa el escalón por ÁREA de su ratio: 720×1280, no un ancho de 1280', () => {
    const { container } = render(
      <ToolCoverVideo
        publicId="v"
        alt="x"
        ratio="9:16"
        boxWidthPx={356}
        boxHeightPx={634}
      />,
    )

    expect(sourcesOf(container)[0].src).toContain('c_limit,w_720,h_1280')
  })

  it('arranca solo (mudo) cuando se ve y no hay preferencias de movimiento reducido', async () => {
    render(<ToolCoverVideo publicId="v" alt="x" {...BOX} />)

    await waitFor(() => expect(playSpy).toHaveBeenCalled())
  })

  it('con prefers-reduced-motion NO arranca solo, y muestra «Play»; no precarga el vídeo', async () => {
    stubMatchMedia(true)

    const { container } = render(
      <ToolCoverVideo publicId="v" alt="x" {...BOX} />,
    )

    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(playSpy).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Play video' }),
    ).toBeInTheDocument()
    expect(container.querySelector('video')).toHaveAttribute('preload', 'none')
  })

  it('con reduced-motion, pulsar «Play» sí lo reproduce (el usuario manda)', async () => {
    stubMatchMedia(true)

    render(<ToolCoverVideo publicId="v" alt="x" {...BOX} />)

    fireEvent.click(screen.getByRole('button', { name: 'Play video' }))

    await waitFor(() => expect(playSpy).toHaveBeenCalled())
  })

  it('el botón de pausa es visible mientras reproduce y pausa al pulsarlo', async () => {
    const { container } = render(
      <ToolCoverVideo publicId="v" alt="x" {...BOX} />,
    )

    const video = container.querySelector('video')!

    // jsdom no dispara 'play' solo.
    fireEvent.play(video)

    const pause = await screen.findByRole('button', { name: 'Pause video' })

    fireEvent.click(pause)

    expect(pauseSpy).toHaveBeenCalled()
  })

  it('al salir de pantalla se pausa solo, y al volver se reanuda', async () => {
    render(<ToolCoverVideo publicId="v" alt="x" {...BOX} />)

    await waitFor(() => expect(playSpy).toHaveBeenCalled())

    pauseSpy.mockClear()
    ioCallbacks.forEach((cb) => cb([{ isIntersecting: false }]))

    await waitFor(() => expect(pauseSpy).toHaveBeenCalled())

    playSpy.mockClear()
    ioCallbacks.forEach((cb) => cb([{ isIntersecting: true }]))

    await waitFor(() => expect(playSpy).toHaveBeenCalled())
  })

  it('tras pausar a mano, volver a verse NO lo reanuda solo', async () => {
    const { container } = render(
      <ToolCoverVideo publicId="v" alt="x" {...BOX} />,
    )

    fireEvent.play(container.querySelector('video')!)
    fireEvent.click(await screen.findByRole('button', { name: 'Pause video' }))

    playSpy.mockClear()
    ioCallbacks.forEach((cb) => cb([{ isIntersecting: false }]))
    ioCallbacks.forEach((cb) => cb([{ isIntersecting: true }]))

    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(playSpy).not.toHaveBeenCalled()
  })

  it('sin caja medida todavía (ancho 0) no pide ningún vídeo: solo el póster', () => {
    const { container } = render(
      <ToolCoverVideo
        publicId="v"
        alt="x"
        ratio="16:9"
        boxWidthPx={0}
        boxHeightPx={0}
      />,
    )

    expect(container.querySelector('video source')).toBeNull()
    expect(container.querySelector('video')?.getAttribute('src')).toBeNull()
    expect(container.querySelector('video')).toHaveAttribute('poster')
  })

  it('no compite con el feed: no se registra en el videoPlaybackCoordinator', () => {
    const register = vi.spyOn(videoPlaybackCoordinator, 'register')
    const registerPrefetch = vi.spyOn(
      videoPlaybackCoordinator,
      'registerPrefetch',
    )

    render(<ToolCoverVideo publicId="v" alt="x" {...BOX} />)

    expect(register).not.toHaveBeenCalled()
    expect(registerPrefetch).not.toHaveBeenCalled()
  })

  it('una conexión lenta NO quita el autoplay de la ficha (solo el del feed)', async () => {
    Object.defineProperty(navigator, 'connection', {
      value: { downlink: 0.5 },
      configurable: true,
    })

    try {
      render(<ToolCoverVideo publicId="v" alt="x" {...BOX} />)

      await waitFor(() => expect(playSpy).toHaveBeenCalled())
    } finally {
      Object.defineProperty(navigator, 'connection', {
        value: undefined,
        configurable: true,
      })
    }
  })

  describe('póster hasta que reproduce (contrato §6.3 y §6.5)', () => {
    function overlay(container: HTMLElement) {
      return container.querySelector('img[aria-hidden="true"]') as HTMLElement
    }

    it('el póster tapa el vídeo hasta el evento «playing», no solo hasta que hay datos', () => {
      const { container } = render(
        <ToolCoverVideo publicId="v" alt="x" {...BOX} />,
      )
      const video = container.querySelector('video')!

      expect(overlay(container).className).not.toContain('posterHidden')

      Object.defineProperty(video, 'readyState', {
        value: 4,
        configurable: true,
      })
      fireEvent(video, new Event('canplay'))

      // Listo, pero todavía sin reproducir: el póster sigue tapando.
      expect(overlay(container).className).not.toContain('posterHidden')

      fireEvent(video, new Event('playing'))

      expect(overlay(container).className).toContain('posterHidden')
    })

    it('el póster de la capa es el mismo que el del atributo poster (ya en caché)', () => {
      const { container } = render(
        <ToolCoverVideo publicId="v" alt="x" {...BOX} />,
      )

      expect(overlay(container).getAttribute('src')).toBe(
        container.querySelector('video')!.getAttribute('poster'),
      )
      expect(overlay(container).getAttribute('alt')).toBe('')
    })
  })

  describe('tiempo máximo, errores y reintentos (contrato §6.5)', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    function mount() {
      const utils = render(<ToolCoverVideo publicId="v" alt="x" {...BOX} />)

      // Deja resolver los microtasks de reinicio de los efectos.
      act(() => {})

      return utils
    }

    function failAllSources(container: HTMLElement) {
      const sources = container.querySelectorAll('video source')

      act(() => {
        sources.forEach((source) => fireEvent.error(source))
      })
    }

    it('si en 10 s no está listo se abandona: sin fuentes, póster y botón «Play»', () => {
      const { container } = mount()

      expect(sourcesOf(container)).toHaveLength(2)

      act(() => {
        vi.advanceTimersByTime(9_999)
      })
      expect(sourcesOf(container)).toHaveLength(2)

      act(() => {
        vi.advanceTimersByTime(1)
      })

      expect(sourcesOf(container)).toHaveLength(0)
      expect(container.querySelector('video')).toHaveAttribute('poster')
      expect(
        screen.getByRole('button', { name: 'Play video' }),
      ).toBeInTheDocument()
    })

    it('estar listo (readyState ≥ 3) antes de los 10 s cancela el tiempo máximo', () => {
      const { container } = mount()
      const video = container.querySelector('video')!

      Object.defineProperty(video, 'readyState', {
        value: 4,
        configurable: true,
      })
      act(() => {
        fireEvent(video, new Event('canplay'))
      })

      act(() => {
        vi.advanceTimersByTime(60_000)
      })

      expect(sourcesOf(container)).toHaveLength(2)
    })

    it('un evento canplay con readyState < 3 NO cuenta como listo', () => {
      const { container } = mount()
      const video = container.querySelector('video')!

      Object.defineProperty(video, 'readyState', {
        value: 2,
        configurable: true,
      })
      act(() => {
        fireEvent(video, new Event('canplay'))
      })

      act(() => {
        vi.advanceTimersByTime(10_000)
      })

      expect(sourcesOf(container)).toHaveLength(0)
    })

    it('tras abandonar, «Play» lo vuelve a pedir desde cero con fuentes nuevas', () => {
      const { container } = mount()

      act(() => {
        vi.advanceTimersByTime(10_000)
      })
      expect(sourcesOf(container)).toHaveLength(0)

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Play video' }))
      })

      expect(sourcesOf(container)).toHaveLength(2)
    })

    it('un error en una sola fuente (la otra se prueba) NO dispara reintentos', () => {
      const { container } = mount()

      act(() => {
        fireEvent.error(container.querySelectorAll('video source')[0])
      })
      act(() => {
        vi.advanceTimersByTime(3_000)
      })

      expect(sourcesOf(container)).toHaveLength(2)
    })

    it('si fallan todas las fuentes: espera 3 s, reintenta con un <video> nuevo, y a la segunda espera 8 s', () => {
      const { container } = mount()
      const first = container.querySelector('video')

      failAllSources(container)
      expect(sourcesOf(container)).toHaveLength(0)

      act(() => {
        vi.advanceTimersByTime(2_999)
      })
      expect(sourcesOf(container)).toHaveLength(0)

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(sourcesOf(container)).toHaveLength(2)
      expect(container.querySelector('video')).not.toBe(first)

      failAllSources(container)

      act(() => {
        vi.advanceTimersByTime(7_999)
      })
      expect(sourcesOf(container)).toHaveLength(0)

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(sourcesOf(container)).toHaveLength(2)
    })

    it('tras dos reintentos fallidos se rinde: póster y «Play», sin más intentos', () => {
      const { container } = mount()

      failAllSources(container)
      act(() => {
        vi.advanceTimersByTime(3_000)
      })
      failAllSources(container)
      act(() => {
        vi.advanceTimersByTime(8_000)
      })
      failAllSources(container)

      act(() => {
        vi.advanceTimersByTime(60_000)
      })

      expect(sourcesOf(container)).toHaveLength(0)
      expect(
        screen.getByRole('button', { name: 'Play video' }),
      ).toBeInTheDocument()
    })

    it('libera el vídeo al abandonarlo y al desmontar (no sigue descargando)', () => {
      const load = vi.spyOn(HTMLMediaElement.prototype, 'load')
      const { unmount } = mount()

      load.mockClear()
      unmount()

      expect(load).toHaveBeenCalled()
    })
  })
})

describe('ToolInsightDetail — portada de vídeo según el tipo de contenido', () => {
  beforeEach(() => {
    global.ResizeObserver = class {
      cb: ResizeObserverCallback
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb
      }
      observe() {
        this.cb(
          [{ contentRect: { width: 1200 } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        )
      }
      disconnect() {}
      unobserve() {}
    } as unknown as typeof ResizeObserver
    global.IntersectionObserver = class {
      observe() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sessionId: 's',
        items: [],
        cursor: 'c',
        round: 0,
        hasMore: false,
      }),
    })) as unknown as typeof fetch
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    stubMatchMedia(false)
  })

  afterEach(() => vi.restoreAllMocks())

  const VIDEO = {
    kind: 'video' as const,
    cloudinaryPublicId: 'greener/content/videos/demo',
  }

  it('en una TOOL, el vídeo es el reproductor nuevo (sin controles nativos), con el alt del pin', () => {
    const { container } = render(
      <ToolInsightDetail
        content={{ ...BASE, coverMedia: VIDEO, coverRatio: '16:9' }}
        coverMediaOverride={VIDEO}
        coverRatioOverride="16:9"
        coverAltOverride="Demo de la herramienta"
      />,
    )

    const video = container.querySelector('video')!

    expect(video).toHaveAttribute('aria-label', 'Demo de la herramienta')
    expect(video.hasAttribute('controls')).toBe(false)
    expect(screen.getByRole('button', { name: /video/i })).toBeInTheDocument()
  })

  it('sin alt del pin, cae al título de la tool', () => {
    const { container } = render(
      <ToolInsightDetail
        content={BASE}
        coverMediaOverride={VIDEO}
        coverRatioOverride="16:9"
      />,
    )

    expect(container.querySelector('video')).toHaveAttribute(
      'aria-label',
      'Mi tool',
    )
  })

  it('en contenido libre (other) la portada de vídeo NO cambia: controles nativos y sin botón propio', () => {
    const { container } = render(
      <ToolInsightDetail
        content={{
          ...BASE,
          type: 'other',
          coverMedia: VIDEO,
          coverRatio: '16:9',
        }}
      />,
    )

    const video = container.querySelector('video')!

    expect(video).toHaveAttribute('controls')
    expect(
      screen.queryByRole('button', { name: /video/i }),
    ).not.toBeInTheDocument()

    // Contrato de medios §4.2: escalón M, dos fuentes explícitas y el audio
    // CONSERVADO (lleva controles): ningún `ac_none`.
    const sources = Array.from(video.querySelectorAll('source')).map((s) =>
      s.getAttribute('src'),
    )

    expect(sources).toHaveLength(2)
    for (const src of sources) {
      expect(src).toContain('c_limit,w_1280,h_720')
      expect(src).not.toContain('ac_none')
      expect(src).not.toContain('f_auto')
    }
    expect(video.hasAttribute('src')).toBe(false)
  })

  it('una portada de imagen sigue pintándose como imagen', () => {
    const { container } = render(
      <ToolInsightDetail
        content={BASE}
        coverMediaOverride={{ kind: 'image', cloudinaryPublicId: 'img' }}
        coverRatioOverride="4:5"
      />,
    )

    expect(container.querySelector('video')).not.toBeInTheDocument()
    expect(container.querySelector('img')).toBeInTheDocument()
  })
})
