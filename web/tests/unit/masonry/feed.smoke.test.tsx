// @vitest-environment jsdom
import { useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { Feed } from '@/components/masonry/Feed'
import { FeedProvider } from '@/components/masonry/FeedProvider'
import type { FeedBatchResult } from '@/modules/feed/application/getFeedSessionBatch'

const SESSION_IDS: Record<string, string> = {
  home: 'session-home',
  tools: 'session-tools',
}

function fakeBatch(
  count: number,
  cursor: string,
  hasMore: boolean,
  prefix: string,
): FeedBatchResult {
  return {
    items: Array.from({ length: count }, (_, i) => ({
      pinId: `${prefix}-pin-${i}`,
      contentId: `${prefix}-case-${i}`,
      kind: 'case',
      destination: `/work/${prefix}-case-${i}`,
      ratio: '1:1',
      label: `Pin ${i}`,
      cta: 'Watch',
      alt: `Alt del pin ${i}`,
      autoplayMode: null,
      media: [{ kind: 'image' as const, cloudinaryPublicId: 'sample' }],
    })),
    cursor,
    round: 0,
    hasMore,
  }
}

function renderFeed(scope: string) {
  return render(
    <FeedProvider>
      <Feed scope={scope} />
    </FeedProvider>,
  )
}

/**
 * Simula "navegar a /work/[slug] y volver" sin desmontar el Provider —
 * justo lo que hace Next.js con (public)/layout.tsx (arquitectura §6.2):
 * solo se desmonta page.tsx (aquí, Feed), el Provider persiste.
 */
function Wrapper({ scope }: { scope: string }) {
  const [show, setShow] = useState(true)
  return (
    <FeedProvider>
      <button onClick={() => setShow((s) => !s)}>toggle</button>
      {show && <Feed scope={scope} />}
    </FeedProvider>
  )
}

describe('Feed — prueba de humo', () => {
  beforeEach(() => {
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
        const { scope } = JSON.parse(init.body as string) as { scope: string }
        return {
          ok: true,
          json: async () => ({ sessionId: SESSION_IDS[scope] ?? scope }),
        } as Response
      }
      const matchedScope = Object.entries(SESSION_IDS).find(([, id]) =>
        url.startsWith(`/api/feed/${id}`),
      )
      if (matchedScope) {
        return {
          ok: true,
          json: async () => fakeBatch(12, 'cursor-1', true, matchedScope[0]),
        } as Response
      }
      throw new Error(`URL inesperada en el test: ${url}`)
    }) as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.sessionStorage.clear()
  })

  it('abre una sesión real con el scope indicado y pinta el primer lote', async () => {
    renderFeed('home')

    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(12)
    })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/feed/sessions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ scope: 'home' }),
      }),
    )
  })

  it('si abrir la sesión falla, muestra un mensaje en vez de romper', async () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
    })) as unknown as typeof fetch

    renderFeed('tools')

    await waitFor(() => {
      expect(
        screen.getByText('No se ha podido cargar el feed. Recarga la página.'),
      ).toBeInTheDocument()
    })
  })

  it('al volver de un detalle (desmontar y remontar bajo el mismo Provider) no vuelve a pedir sesión ni lote', async () => {
    render(<Wrapper scope="home" />)

    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(12)
    })

    const fetchCallsAfterFirstLoad = vi.mocked(global.fetch).mock.calls.length

    fireEvent.click(screen.getByText('toggle')) // "navega" fuera
    expect(screen.queryAllByRole('link')).toHaveLength(0)

    fireEvent.click(screen.getByText('toggle')) // "vuelve"

    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(12)
    })

    expect(vi.mocked(global.fetch).mock.calls.length).toBe(
      fetchCallsAfterFirstLoad,
    )
  })

  it('dos scopes distintos en el mismo Provider mantienen sesiones y pines independientes', async () => {
    function TwoScopes() {
      return (
        <FeedProvider>
          <Feed scope="home" />
          <Feed scope="tools" />
        </FeedProvider>
      )
    }

    render(<TwoScopes />)

    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(24) // 12 + 12
    })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/feed/sessions',
      expect.objectContaining({ body: JSON.stringify({ scope: 'home' }) }),
    )
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/feed/sessions',
      expect.objectContaining({ body: JSON.stringify({ scope: 'tools' }) }),
    )
    expect(global.fetch).toHaveBeenCalledWith(`/api/feed/${SESSION_IDS.home}`)
    expect(global.fetch).toHaveBeenCalledWith(`/api/feed/${SESSION_IDS.tools}`)
  })

  it('restaura la posición de scroll guardada al volver de un detalle', async () => {
    const scrollToSpy = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => {})

    render(<Wrapper scope="home" />)

    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(12)
    })

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

  it('con una ronda vacía (subhome sin contenido todavía), no entra en bucle de peticiones aunque el servidor diga hasMore=true', async () => {
    // A diferencia del stub no-op del beforeEach: aquí el sentinel tiene
    // que reportarse "visible" de verdad al observarlo, igual que pasaría
    // en un navegador real con una página casi vacía — si no, este test
    // no reproduce el bucle real (loadMore cambia de identidad en cada
    // actualización de estado, lo que reconecta el observer una y otra
    // vez; sin este stub, nunca se llega a disparar una segunda vez).
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
              isIntersecting: true,
              intersectionRatio: 1,
              target,
            } as IntersectionObserverEntry,
          ],
          this as unknown as IntersectionObserver,
        )
      }
      disconnect() {}
      unobserve() {}
    }

    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/feed/sessions' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({ sessionId: 'session-insights' }),
        } as Response
      }
      if (url.startsWith('/api/feed/session-insights')) {
        // El servidor devuelve hasMore=true siempre (arquitectura §8.5)
        // — el corte real tiene que salir del cliente al ver 0 items.
        return {
          ok: true,
          json: async () => fakeBatch(0, 'cursor-1', true, 'insights'),
        } as Response
      }
      throw new Error(`URL inesperada en el test: ${url}`)
    }) as typeof fetch

    renderFeed('insights')

    await waitFor(() => {
      expect(
        screen.getByText('Todavía no hay contenido publicado en esta sección.'),
      ).toBeInTheDocument()
    })

    const fetchCallsAfterEmptyRound = vi.mocked(global.fetch).mock.calls.length

    // Deja correr un poco más: sin el fix, aquí seguiría acumulando
    // llamadas sin parar.
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(vi.mocked(global.fetch).mock.calls.length).toBe(
      fetchCallsAfterEmptyRound,
    )
  })
})
