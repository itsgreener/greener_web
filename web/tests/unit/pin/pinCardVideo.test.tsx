// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { PinCard, type PinCardData } from '@/components/pin/PinCard'

type IOCallback = IntersectionObserverCallback

let observers: Array<{ cb: IOCallback; el: Element | null }> = []

function pin(durationSeconds: number | null | undefined): PinCardData {
  return {
    pinId: `p-${String(durationSeconds)}`,
    destination: '/tools/mi-tool?pin=p',
    ratio: '4:5',
    label: 'Gancho',
    cta: 'Use',
    alt: 'Demo',
    autoplayMode: 'viewport',
    media: [{ kind: 'video', cloudinaryPublicId: 'vid', durationSeconds }],
  }
}

const STYLE = { x: 0, y: 0, width: 300, height: 375 }

describe('PinCard — vídeo largo (5 oct 2026)', () => {
  beforeEach(() => {
    observers = []

    // IntersectionObserver que se deja disparar a mano.
    global.IntersectionObserver = class {
      cb: IOCallback
      el: Element | null = null
      constructor(cb: IOCallback) {
        this.cb = cb
        observers.push(this)
      }
      observe(el: Element) {
        this.el = el
      }
      disconnect() {}
      unobserve() {}
    } as unknown as typeof IntersectionObserver

    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function makeVisible() {
    for (const o of observers) {
      o.cb(
        [
          {
            intersectionRatio: 1,
            boundingClientRect: { top: 100, bottom: 400 },
          } as IntersectionObserverEntry,
        ],
        o as unknown as IntersectionObserver,
      )
    }
  }

  it('un vídeo de 6 s con autoplay viewport se anima al verse (como siempre)', async () => {
    const { container } = render(<PinCard pin={pin(6)} style={STYLE} />)

    makeVisible()

    await vi.waitFor(() =>
      expect(container.querySelector('video')).toBeInTheDocument(),
    )
  })

  it('un vídeo de 15 s se queda en su poster aunque sea visible y tenga autoplay: no se descarga entero en el feed', async () => {
    const { container } = render(<PinCard pin={pin(15)} style={STYLE} />)

    makeVisible()

    // Margen para que un eventual setState termine.
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(container.querySelector('video')).not.toBeInTheDocument()
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      '/video/upload/',
    )
  })

  it('el límite es exactamente 8 s: 8 se anima y 9 no', async () => {
    const eight = render(<PinCard pin={pin(8)} style={STYLE} />)
    makeVisible()
    await vi.waitFor(() =>
      expect(eight.container.querySelector('video')).toBeInTheDocument(),
    )
    eight.unmount()
    observers = []

    const nine = render(<PinCard pin={pin(9)} style={STYLE} />)
    makeVisible()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(nine.container.querySelector('video')).not.toBeInTheDocument()
  })

  it('sin duración conocida (filas antiguas) se anima como antes de existir el umbral', async () => {
    const { container } = render(<PinCard pin={pin(null)} style={STYLE} />)

    makeVisible()

    await vi.waitFor(() =>
      expect(container.querySelector('video')).toBeInTheDocument(),
    )
  })
})
