// @vitest-environment jsdom
import { useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { HomeFeed } from '@/components/masonry/HomeFeed'
import { HomeFeedProvider } from '@/components/masonry/HomeFeed/HomeFeedProvider'
import type { FeedBatchResult } from '@/modules/feed/application/getFeedSessionBatch'

const SESSION_ID = 'session-abc'

function fakeBatch(
  count: number,
  cursor: string,
  hasMore: boolean,
): FeedBatchResult {
  return {
    items: Array.from({ length: count }, (_, i) => ({
      pinId: `pin-${i}`,
      contentId: `case-${i}`,
      kind: 'case',
      destination: `/work/case-${i}`,
      ratio: '1:1',
      label: `Pin ${i}`,
      cta: 'Watch',
      alt: `Alt del pin ${i}`,
      media: [{ kind: 'image' as const, cloudinaryPublicId: 'sample' }],
    })),
    cursor,
    hasMore,
  }
}

/**
 * Home real: HomeFeed vive bajo HomeFeedProvider (app/(public)/layout.tsx
 * en producción) — sin el Provider, useHomeFeedContext() lanza.
 */
function renderHome() {
  return render(
    <HomeFeedProvider>
      <HomeFeed />
    </HomeFeedProvider>,
  )
}

/**
 * Simula "navegar a /work/[slug] y volver" sin desmontar el Provider —
 * justo lo que hace Next.js con (public)/layout.tsx (arquitectura §6.2):
 * solo se desmonta page.tsx (aquí, HomeFeed), el Provider persiste.
 */
function Wrapper() {
  const [show, setShow] = useState(true)
  return (
    <HomeFeedProvider>
      <button onClick={() => setShow((s) => !s)}>toggle</button>
      {show && <HomeFeed />}
    </HomeFeedProvider>
  )
}

describe('HomeFeed — prueba de humo', () => {
  beforeEach(() => {
    // Cada test debe partir de cero: HomeFeedProvider hidrata desde
    // sessionStorage si encuentra un pageLoadId igual al de este módulo
    // (estable durante toda la ejecución de este fichero de test) — sin
    // esto, lo que deja un test contaminaría el siguiente.
    window.sessionStorage.clear()

    // ResizeObserver e IntersectionObserver no existen en jsdom. El stub
    // de ResizeObserver invoca el callback en observe() con un ancho fijo,
    // simulando lo que haría el navegador real — si no, containerWidth se
    // queda en 0 y el layout nunca llega a calcularse.
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
    // @ts-expect-error -- stub mínimo suficiente para el smoke test
    global.IntersectionObserver = class {
      observe() {}
      disconnect() {}
    }

    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/feed/sessions' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({ sessionId: SESSION_ID }),
        } as Response
      }
      if (url.startsWith(`/api/feed/${SESSION_ID}`)) {
        return {
          ok: true,
          json: async () => fakeBatch(12, 'cursor-1', true),
        } as Response
      }
      throw new Error(`URL inesperada en el test: ${url}`)
    }) as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.sessionStorage.clear()
    cleanup()
  })

  it('abre una sesión real y pinta el primer lote', async () => {
    renderHome()

    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(12)
    })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/feed/sessions',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(global.fetch).toHaveBeenCalledWith(`/api/feed/${SESSION_ID}`)
  })

  it('si abrir la sesión falla, muestra un mensaje en vez de romper', async () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
    })) as unknown as typeof fetch

    renderHome()

    await waitFor(() => {
      expect(
        screen.getByText('No se ha podido cargar el feed. Recarga la página.'),
      ).toBeInTheDocument()
    })
  })

  it('al volver de un detalle (desmontar y remontar bajo el mismo Provider) no vuelve a pedir sesión ni lote — arquitectura §6.2, criterio de aceptación §20.1', async () => {
    render(<Wrapper />)

    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(12)
    })

    const fetchCallsAfterFirstLoad = vi.mocked(global.fetch).mock.calls.length

    // "Navegar a /work/[slug]": desmonta HomeFeed, el Provider sigue vivo.
    fireEvent.click(screen.getByText('toggle'))
    expect(screen.queryAllByRole('link')).toHaveLength(0)

    // "Volver a /": remonta HomeFeed bajo el mismo Provider.
    fireEvent.click(screen.getByText('toggle'))

    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(12)
    })

    // Ni una llamada de red más: los 12 pines ya estaban en el contexto.
    expect(vi.mocked(global.fetch).mock.calls.length).toBe(
      fetchCallsAfterFirstLoad,
    )
  })

  it('restaura la posición de scroll guardada al volver de un detalle', async () => {
    const scrollToSpy = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => {})

    render(<Wrapper />)

    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(12)
    })

    // Simula que el usuario había bajado hasta y=456 antes de navegar.
    Object.defineProperty(window, 'scrollY', {
      value: 456,
      configurable: true,
    })
    fireEvent.scroll(window)

    // El guardado de scroll está throttled por requestAnimationFrame — hay
    // que dejar que corra antes de "navegar", si no la navegación (los dos
    // clics de abajo) adelanta al guardado y se restaura un scrollY viejo.
    await new Promise((resolve) => requestAnimationFrame(resolve))

    fireEvent.click(screen.getByText('toggle')) // fuera
    fireEvent.click(screen.getByText('toggle')) // vuelta

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith(0, 456)
    })
  })
})
