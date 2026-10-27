// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  EMPTY_SCOPE_STATE,
  readFromSessionStorage,
  withScroll,
  withoutNewsletter,
  writeToSessionStorage,
  type ScopeFeedState,
} from '@/components/masonry/FeedProvider/feedStorage'
import { pageLoadId } from '@/components/masonry/pageLoadId'
import type {
  FeedBatchItem,
  FeedNewsletterItem,
  FeedPinItem,
} from '@/modules/feed/domain/feedReadModels'

const pin = (id: string) => ({ pinId: id, kind: 'case' }) as FeedPinItem
const newsletter = (id: string) =>
  ({ pinId: id, kind: 'newsletter' }) as unknown as FeedNewsletterItem

function scope(items: FeedBatchItem[], batchSizes: number[]): ScopeFeedState {
  return { ...EMPTY_SCOPE_STATE, items, batchSizes }
}

describe('withoutNewsletter', () => {
  it('quita las tarjetas de newsletter y corrige el tamaño de cada lote', () => {
    const state = scope(
      [pin('a'), newsletter('n1'), pin('b'), pin('c'), newsletter('n2')],
      [3, 2],
    )

    const result = withoutNewsletter(state)

    expect(result.items.map((i) => i.pinId)).toEqual(['a', 'b', 'c'])
    expect(result.batchSizes).toEqual([2, 1])
  })

  it('conserva la tarjeta usada (keepPinId)', () => {
    const state = scope([pin('a'), newsletter('n1'), newsletter('n2')], [3])

    const result = withoutNewsletter(state, 'n1')

    expect(result.items.map((i) => i.pinId)).toEqual(['a', 'n1'])
    expect(result.batchSizes).toEqual([2])
  })

  it('sin newsletter devuelve el mismo objeto', () => {
    const state = scope([pin('a'), pin('b')], [2])

    expect(withoutNewsletter(state)).toBe(state)
  })

  it('un lote que se queda sin tarjetas cuenta 0, no desaparece', () => {
    const state = scope([newsletter('n1'), pin('a')], [1, 1])

    expect(withoutNewsletter(state).batchSizes).toEqual([0, 1])
  })
})

describe('withScroll', () => {
  it('pone el scroll más reciente de cada scope', () => {
    const scopes = {
      home: { ...EMPTY_SCOPE_STATE, scrollY: 10 },
      work: { ...EMPTY_SCOPE_STATE, scrollY: 20 },
    }

    const result = withScroll(scopes, { home: 500 })

    expect(result.home.scrollY).toBe(500)
    expect(result.work.scrollY).toBe(20)
  })

  it('no modifica el original', () => {
    const scopes = { home: { ...EMPTY_SCOPE_STATE, scrollY: 10 } }

    withScroll(scopes, { home: 500 })

    expect(scopes.home.scrollY).toBe(10)
  })
})

describe('sessionStorage del feed', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    document.cookie = 'greener_newsletter=; Max-Age=0; Path=/'
  })

  it('lo escrito se lee de vuelta en la misma carga del documento', () => {
    const scopes = { home: scope([pin('a')], [1]) }

    writeToSessionStorage(scopes)

    expect(readFromSessionStorage()).toEqual(scopes)
  })

  it('un estado de otra carga del documento no vale', () => {
    window.sessionStorage.setItem(
      'greener:feed',
      JSON.stringify({
        pageLoadId: `${pageLoadId}-otra`,
        scopes: { home: scope([pin('a')], [1]) },
      }),
    )

    expect(readFromSessionStorage()).toEqual({})
  })

  it('sin nada guardado o con JSON roto devuelve vacío', () => {
    expect(readFromSessionStorage()).toEqual({})

    window.sessionStorage.setItem('greener:feed', '{no es json')
    expect(readFromSessionStorage()).toEqual({})
  })

  it('un dispositivo ya suscrito no recupera el pin de newsletter', () => {
    writeToSessionStorage({ home: scope([pin('a'), newsletter('n')], [2]) })
    document.cookie = 'greener_newsletter=1; Path=/'

    const restored = readFromSessionStorage()

    expect(restored.home.items.map((i) => i.pinId)).toEqual(['a'])
  })

  it('si sessionStorage lanza al escribir, no rompe nada', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

    expect(() =>
      writeToSessionStorage({ home: scope([pin('a')], [1]) }),
    ).not.toThrow()

    spy.mockRestore()
  })

  it('si sessionStorage lanza al leer, devuelve vacío', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('SecurityError')
      })

    expect(readFromSessionStorage()).toEqual({})

    spy.mockRestore()
  })
})
