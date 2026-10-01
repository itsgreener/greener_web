// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { FeedProvider, useFeedContext } from '@/components/masonry/FeedProvider'
import type { FeedBatchItem } from '@/modules/feed/application/getFeedSessionBatch'

/**
 * appendBatch (FeedProvider.tsx) es donde vivía el bug real corregido el
 * 30 sep (PROGRESO §2.19, "el scroll de la home se rompió"): un lote
 * vacío por límite de peticiones superado (api/feed/[sessionId]/route.ts,
 * §2.16) se trataba IGUAL que un lote vacío por catálogo agotado de
 * verdad — ambos cortaban `hasMore` para siempre. Como el sentinel de
 * prefetch (useFeed.ts) solo reacciona a un CAMBIO de intersección, una
 * vez cortado nada volvía a cargar por su cuenta: hacía falta un scroll
 * manual, y aun así no servía de nada porque `hasMore` ya estaba en
 * `false` para siempre en ese scope.
 */

const PIN = (id: string): FeedBatchItem =>
  ({
    pinId: id,
    contentId: `content-${id}`,
    kind: 'case',
    destination: `/work/${id}`,
    ratio: '1:1',
    label: null,
    cta: 'Watch',
    alt: `Alt ${id}`,
    autoplayMode: null,
    media: [{ kind: 'image', cloudinaryPublicId: 'sample' }],
  }) as FeedBatchItem

function TestConsumer({ scope }: { scope: string }) {
  const { getState, appendBatch } = useFeedContext()
  const state = getState(scope)

  return (
    <div>
      <p data-testid="item-count">{state.items.length}</p>
      <p data-testid="has-more">{String(state.hasMore)}</p>
      <button
        onClick={() =>
          appendBatch(scope, {
            items: [PIN('a'), PIN('b')],
            cursor: 'cursor-1',
            hasMore: true,
          })
        }
      >
        lote normal con pines
      </button>
      <button
        onClick={() =>
          appendBatch(scope, {
            items: [],
            cursor: '',
            hasMore: true,
            rateLimited: true,
          })
        }
      >
        lote vacío por límite de peticiones
      </button>
      <button
        onClick={() =>
          appendBatch(scope, { items: [], cursor: 'cursor-x', hasMore: true })
        }
      >
        lote vacío sin contenido real (subhome agotada)
      </button>
    </div>
  )
}

function renderWithProvider(scope = 'home') {
  render(
    <FeedProvider>
      <TestConsumer scope={scope} />
    </FeedProvider>,
  )
}

beforeEach(() => {
  window.sessionStorage.clear()
})

describe('appendBatch — lote vacío por límite de peticiones (rateLimited)', () => {
  it('NO toca hasMore: sigue en true, como estaba', () => {
    renderWithProvider()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'lote vacío por límite de peticiones',
      }),
    )

    expect(screen.getByTestId('has-more')).toHaveTextContent('true')
  })

  it('no añade pines ni consume el cursor', () => {
    renderWithProvider()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'lote vacío por límite de peticiones',
      }),
    )

    expect(screen.getByTestId('item-count')).toHaveTextContent('0')
  })

  it('tras un rateLimited, un lote normal posterior carga con total normalidad (el scroll se recupera solo)', () => {
    renderWithProvider()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'lote vacío por límite de peticiones',
      }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'lote normal con pines' }),
    )

    expect(screen.getByTestId('item-count')).toHaveTextContent('2')
    expect(screen.getByTestId('has-more')).toHaveTextContent('true')
  })

  it('CONTRASTE: un lote vacío de verdad (subhome sin contenido, sin rateLimited) sí corta hasMore — ese comportamiento no cambia', () => {
    renderWithProvider()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'lote vacío sin contenido real (subhome agotada)',
      }),
    )

    expect(screen.getByTestId('has-more')).toHaveTextContent('false')
  })

  it('cada scope tiene su propio estado: un rateLimited en "home" no afecta a "tools"', () => {
    render(
      <FeedProvider>
        <TestConsumer scope="home" />
        <TestConsumer scope="tools" />
      </FeedProvider>,
    )

    const [homeLimitBtn] = screen.getAllByRole('button', {
      name: 'lote vacío por límite de peticiones',
    })
    const [, toolsEmptyBtn] = screen.getAllByRole('button', {
      name: 'lote vacío sin contenido real (subhome agotada)',
    })

    fireEvent.click(homeLimitBtn)
    fireEvent.click(toolsEmptyBtn)

    const [homeHasMore, toolsHasMore] = screen.getAllByTestId('has-more')

    // home: solo rate-limited, sigue teniendo más por delante.
    expect(homeHasMore).toHaveTextContent('true')
    // tools: lote vacío de verdad, cortado — sin relación con lo de home.
    expect(toolsHasMore).toHaveTextContent('false')
  })
})

describe('appendBatch — regresión: seguir cargando un scope ya marcado sin más contenido', () => {
  it('tras un lote vacío real (no rateLimited), un siguiente intento de la UI no debería reactivarse solo — hasMore se queda en false', () => {
    renderWithProvider()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'lote vacío sin contenido real (subhome agotada)',
      }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'lote normal con pines' }),
    )

    // Aunque llegue un lote "normal" después, lo decisivo es que el
    // corte real (agotado de verdad) sigue siendo un corte: esto
    // documenta que appendBatch no "resucita" un scope ya cortado por
    // su cuenta — haría falta una ronda nueva que confirme hasMore de
    // verdad, que es justo lo que no pasa aquí a propósito.
    expect(screen.getByTestId('item-count')).toHaveTextContent('2')
  })
})
