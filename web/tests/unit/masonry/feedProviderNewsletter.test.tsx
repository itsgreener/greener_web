// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { FeedProvider, useFeedContext } from '@/components/masonry/FeedProvider'
import { pageLoadId } from '@/components/masonry/pageLoadId'
import type {
  FeedBatchItem,
  FeedNewsletterItem,
  FeedPinItem,
} from '@/modules/feed/domain/feedReadModels'

/**
 * Plan de `other`, fase 3 (§5.7): tras suscribirse se retiran las demás
 * tarjetas de newsletter ya cargadas (la usada se queda con su mensaje) y un
 * dispositivo con la cookie no recupera ninguna del estado restaurado.
 */

const PIN = (id: string): FeedPinItem =>
  ({
    pinId: id,
    contentId: `content-${id}`,
    kind: 'case',
    destination: `/work/${id}`,
    ratio: '1:1',
    label: null,
    cta: 'Watch',
    alt: id,
    autoplayMode: null,
    media: [{ kind: 'image', cloudinaryPublicId: 'sample' }],
  }) as FeedPinItem

const NEWS = (n: number): FeedNewsletterItem => ({
  kind: 'newsletter',
  pinId: `newsletter:n1:${n}`,
  contentId: 'n1',
  title: 'Newsletter',
  text: null,
})

const BATCH_1: FeedBatchItem[] = [PIN('a'), NEWS(0), PIN('b'), PIN('c')]
const BATCH_2: FeedBatchItem[] = [PIN('d'), NEWS(1), PIN('e')]

function Consumer({ scope }: { scope: string }) {
  const { getState, appendBatch, retireNewsletterCards } = useFeedContext()
  const state = getState(scope)

  return (
    <div>
      <p data-testid="ids">{state.items.map((i) => i.pinId).join(',')}</p>
      <p data-testid="sizes">{state.batchSizes.join(',')}</p>
      <button
        onClick={() => {
          appendBatch(scope, { items: BATCH_1, cursor: 'c1', hasMore: true })
          appendBatch(scope, { items: BATCH_2, cursor: 'c2', hasMore: true })
        }}
      >
        cargar dos lotes
      </button>
      <button onClick={() => retireNewsletterCards('newsletter:n1:1')}>
        suscribirse desde la segunda tarjeta
      </button>
    </div>
  )
}

function renderProvider(scope = 'home') {
  render(
    <FeedProvider>
      <Consumer scope={scope} />
    </FeedProvider>,
  )
}

function clearCookie() {
  document.cookie = 'greener_newsletter=; Max-Age=0; Path=/'
}

beforeEach(() => {
  window.sessionStorage.clear()
  clearCookie()
})

afterEach(clearCookie)

describe('retireNewsletterCards', () => {
  it('quita las demás tarjetas de newsletter y conserva la usada', () => {
    renderProvider()
    fireEvent.click(screen.getByText('cargar dos lotes'))
    expect(screen.getByTestId('ids')).toHaveTextContent(
      'a,newsletter:n1:0,b,c,d,newsletter:n1:1,e',
    )

    fireEvent.click(screen.getByText('suscribirse desde la segunda tarjeta'))

    expect(screen.getByTestId('ids')).toHaveTextContent(
      'a,b,c,d,newsletter:n1:1,e',
    )
  })

  it('corrige el tamaño de cada lote para que la virtualización agrupe bien', () => {
    renderProvider()
    fireEvent.click(screen.getByText('cargar dos lotes'))
    expect(screen.getByTestId('sizes')).toHaveTextContent('4,3')

    fireEvent.click(screen.getByText('suscribirse desde la segunda tarjeta'))

    // El lote 1 pierde su tarjeta (4 → 3); el 2 conserva la usada (3).
    expect(screen.getByTestId('sizes')).toHaveTextContent('3,3')
  })

  it('actúa sobre todos los scopes, no solo sobre el de la tarjeta', () => {
    function TwoScopes() {
      const { getState, appendBatch, retireNewsletterCards } = useFeedContext()
      return (
        <div>
          <p data-testid="home">{getState('home').items.length}</p>
          <p data-testid="work">{getState('work').items.length}</p>
          <button
            onClick={() => {
              appendBatch('home', {
                items: BATCH_1,
                cursor: 'c',
                hasMore: true,
              })
              appendBatch('work', {
                items: BATCH_1,
                cursor: 'c',
                hasMore: true,
              })
            }}
          >
            cargar
          </button>
          <button onClick={() => retireNewsletterCards('otra')}>retirar</button>
        </div>
      )
    }
    render(
      <FeedProvider>
        <TwoScopes />
      </FeedProvider>,
    )

    fireEvent.click(screen.getByText('cargar'))
    fireEvent.click(screen.getByText('retirar'))

    expect(screen.getByTestId('home')).toHaveTextContent('3')
    expect(screen.getByTestId('work')).toHaveTextContent('3')
  })
})

describe('estado restaurado de sessionStorage', () => {
  function seedStorage() {
    window.sessionStorage.setItem(
      'greener:feed',
      JSON.stringify({
        pageLoadId,
        scopes: {
          home: {
            sessionId: 's1',
            items: [...BATCH_1, ...BATCH_2],
            batchSizes: [4, 3],
            cursor: 'c2',
            hasMore: true,
            scrollY: 0,
          },
        },
      }),
    )
  }

  it('sin cookie, restaura las tarjetas de newsletter tal cual', () => {
    seedStorage()
    renderProvider()

    expect(screen.getByTestId('ids')).toHaveTextContent(
      'a,newsletter:n1:0,b,c,d,newsletter:n1:1,e',
    )
  })

  it('con la cookie greener_newsletter, filtra TODAS (también la usada) y ajusta los lotes', () => {
    document.cookie = 'greener_newsletter=1; Path=/'
    seedStorage()
    renderProvider()

    expect(screen.getByTestId('ids')).toHaveTextContent('a,b,c,d,e')
    expect(screen.getByTestId('sizes')).toHaveTextContent('3,2')
  })
})
