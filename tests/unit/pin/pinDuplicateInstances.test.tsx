// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { PinCard, type PinCardData } from '@/components/pin/PinCard'

/**
 * Regresión del 7 oct 2026: el coordinador de vídeo indexa por id y el id era
 * el `pinId`. Con el mismo pin montado dos veces (el feed repite pines), la
 * segunda tarjeta le pisaba el registro a la primera —que quedaba sin hueco
 * ni billete de prefetch— y al desmontarse una se llevaba por delante el
 * registro de la que seguía en pantalla. Ahora cada tarjeta se registra con
 * su `instanceId`.
 */

const STYLE = { x: 0, y: 0, width: 300, height: 375 }

const PIN: PinCardData = {
  pinId: 'mismo-pin',
  destination: '/tools/t?pin=mismo-pin',
  ratio: '4:5',
  label: 'Gancho',
  cta: null,
  alt: 'Demo',
  autoplayMode: 'viewport',
  media: [{ kind: 'video', cloudinaryPublicId: 'vid', durationSeconds: 6 }],
}

const videos = (c: HTMLElement) => c.querySelectorAll('video')

/** Renderiza y deja correr los avisos asíncronos del IntersectionObserver simulado. */
async function renderAsync(ui: React.ReactElement) {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(ui)
  })
  return result
}

describe('PinCard — el mismo pin montado dos veces', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    })
    global.IntersectionObserver = class {
      cb: IntersectionObserverCallback
      constructor(cb: IntersectionObserverCallback) {
        this.cb = cb
      }
      // ASÍNCRONO, como el real: el navegador avisa cuando ya se han
      // registrado TODAS las tarjetas. Un simulador síncrono (avisando dentro
      // del useEffect de cada tarjeta) ocultaba el bug: cada tarjeta
      // conseguía su billete antes de que la siguiente le pisara el registro.
      observe(target: Element) {
        queueMicrotask(() =>
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
          ),
        )
      }
      disconnect() {}
      unobserve() {}
    } as unknown as typeof IntersectionObserver
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('con instanceId distinto, las DOS tarjetas consiguen su billete y montan su vídeo', async () => {
    const { container } = await renderAsync(
      <>
        <PinCard pin={PIN} instanceId="0:mismo-pin" style={STYLE} />
        <PinCard pin={PIN} instanceId="7:mismo-pin" style={STYLE} />
      </>,
    )

    expect(videos(container)).toHaveLength(2)
  })

  it('desmontar una de las dos no le quita su vídeo a la que sigue en pantalla', async () => {
    const { container, rerender } = await renderAsync(
      <>
        <PinCard pin={PIN} instanceId="0:mismo-pin" style={STYLE} />
        <PinCard pin={PIN} instanceId="7:mismo-pin" style={STYLE} />
      </>,
    )
    expect(videos(container)).toHaveLength(2)

    await act(async () => {
      rerender(<PinCard pin={PIN} instanceId="0:mismo-pin" style={STYLE} />)
    })

    expect(videos(container)).toHaveLength(1)
  })

  it('sin instanceId (usos sueltos, p. ej. un solo PinCard) sigue funcionando con el pinId', async () => {
    const { container } = await renderAsync(<PinCard pin={PIN} style={STYLE} />)

    expect(videos(container)).toHaveLength(1)
  })
})
