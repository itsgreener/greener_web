// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

describe('ToolCoverVideo — vídeo de la ficha de una tool (5 oct 2026)', () => {
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

    stubMatchMedia(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('pinta un <video> mudo, en bucle, con alt accesible, poster de Cloudinary y el ancho de entrega de detalle', async () => {
    const { container } = render(
      <ToolCoverVideo
        publicId="greener/content/videos/demo"
        alt="Cómo se usa"
        boxWidthPx={500}
      />,
    )

    const video = container.querySelector('video')!

    await waitFor(() =>
      expect(video.getAttribute('src')).toContain('w_960,c_limit'),
    )

    expect(video.muted).toBe(true)
    expect(video.loop).toBe(true)
    expect(video).toHaveAttribute('aria-label', 'Cómo se usa')
    expect(video.getAttribute('poster')).toContain('/video/upload/')
    expect(video.getAttribute('src')).toContain('q_auto,f_auto')
    expect(video.hasAttribute('controls')).toBe(false)
  })

  it('arranca solo (mudo) cuando se ve y no hay preferencias de movimiento reducido', async () => {
    render(<ToolCoverVideo publicId="v" alt="x" boxWidthPx={500} />)

    await waitFor(() => expect(playSpy).toHaveBeenCalled())
  })

  it('con prefers-reduced-motion NO arranca solo, y muestra «Play»; no precarga el vídeo', async () => {
    stubMatchMedia(true)

    const { container } = render(
      <ToolCoverVideo publicId="v" alt="x" boxWidthPx={500} />,
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

    render(<ToolCoverVideo publicId="v" alt="x" boxWidthPx={500} />)

    fireEvent.click(screen.getByRole('button', { name: 'Play video' }))

    await waitFor(() => expect(playSpy).toHaveBeenCalled())
  })

  it('el botón de pausa es visible mientras reproduce y pausa al pulsarlo', async () => {
    const { container } = render(
      <ToolCoverVideo publicId="v" alt="x" boxWidthPx={500} />,
    )

    const video = container.querySelector('video')!

    // jsdom no dispara 'play' solo.
    fireEvent.play(video)

    const pause = await screen.findByRole('button', { name: 'Pause video' })

    fireEvent.click(pause)

    expect(pauseSpy).toHaveBeenCalled()
  })

  it('al salir de pantalla se pausa solo, y al volver se reanuda', async () => {
    render(<ToolCoverVideo publicId="v" alt="x" boxWidthPx={500} />)

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
      <ToolCoverVideo publicId="v" alt="x" boxWidthPx={500} />,
    )

    fireEvent.play(container.querySelector('video')!)
    fireEvent.click(await screen.findByRole('button', { name: 'Pause video' }))

    playSpy.mockClear()
    ioCallbacks.forEach((cb) => cb([{ isIntersecting: false }]))
    ioCallbacks.forEach((cb) => cb([{ isIntersecting: true }]))

    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(playSpy).not.toHaveBeenCalled()
  })

  it('sin caja medida todavía (ancho 0) no pide ningún vídeo: solo el poster', () => {
    const { container } = render(
      <ToolCoverVideo publicId="v" alt="x" boxWidthPx={0} />,
    )

    expect(container.querySelector('video')?.getAttribute('src')).toBeNull()
  })

  it('no compite con el feed: no se registra en el videoPlaybackCoordinator', () => {
    const register = vi.spyOn(videoPlaybackCoordinator, 'register')

    render(<ToolCoverVideo publicId="v" alt="x" boxWidthPx={500} />)

    expect(register).not.toHaveBeenCalled()
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

    expect(container.querySelector('video')).toHaveAttribute('controls')
    expect(
      screen.queryByRole('button', { name: /video/i }),
    ).not.toBeInTheDocument()
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
