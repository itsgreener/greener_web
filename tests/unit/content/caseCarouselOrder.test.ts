import { describe, expect, it } from 'vitest'

import {
  isSameOrder,
  moveCarouselItem,
  nextCarouselSortOrder,
  reconcileOrder,
  sortByNaturalName,
} from '@/modules/content/domain/caseCarouselOrder'

describe('nextCarouselSortOrder', () => {
  it('un carrusel vacío empieza en 0', () => {
    expect(nextCarouselSortOrder([])).toBe(0)
  })

  it('es el mayor orden existente más uno', () => {
    expect(nextCarouselSortOrder([{ sortOrder: 0 }, { sortOrder: 1 }])).toBe(2)
  })

  it('REGRESIÓN: tras quitar la primera diapositiva no empata con la que queda', () => {
    // Órdenes 1 y 2 (la 0 se quitó). «Cuántas hay» daría 2 y empataría.
    const items = [{ sortOrder: 1 }, { sortOrder: 2 }]

    expect(items.length).toBe(2)
    expect(nextCarouselSortOrder(items)).toBe(3)
  })

  it('no depende del orden en que lleguen', () => {
    expect(
      nextCarouselSortOrder([
        { sortOrder: 4 },
        { sortOrder: 0 },
        { sortOrder: 2 },
      ]),
    ).toBe(5)
  })
})

describe('sortByNaturalName', () => {
  const names = (items: Array<{ name: string }>) => items.map((i) => i.name)

  it('ordena los números como números: slide-2 antes que slide-10', () => {
    const sorted = sortByNaturalName(
      ['slide-10.jpg', 'slide-2.jpg', 'slide-1.jpg'].map((name) => ({ name })),
    )

    expect(names(sorted)).toEqual([
      'slide-1.jpg',
      'slide-2.jpg',
      'slide-10.jpg',
    ])
  })

  it('no distingue mayúsculas', () => {
    const sorted = sortByNaturalName(
      ['b.jpg', 'A.jpg', 'c.jpg'].map((name) => ({ name })),
    )

    expect(names(sorted)).toEqual(['A.jpg', 'b.jpg', 'c.jpg'])
  })

  it('no modifica el original', () => {
    const original = [{ name: 'b' }, { name: 'a' }]

    sortByNaturalName(original)

    expect(names(original)).toEqual(['b', 'a'])
  })
})

describe('moveCarouselItem', () => {
  const list = ['a', 'b', 'c', 'd']

  it('mueve un elemento hacia delante y hacia atrás', () => {
    expect(moveCarouselItem(list, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveCarouselItem(list, 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('acota el destino al rango: «posición 99» es al final', () => {
    expect(moveCarouselItem(list, 0, 99)).toEqual(['b', 'c', 'd', 'a'])
    expect(moveCarouselItem(list, 3, -5)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('sin movimiento o con un origen inexistente devuelve una copia igual', () => {
    const same = moveCarouselItem(list, 1, 1)

    expect(same).toEqual(list)
    expect(same).not.toBe(list)
    expect(moveCarouselItem(list, 9, 0)).toEqual(list)
    expect(moveCarouselItem(list, -1, 0)).toEqual(list)
    expect(moveCarouselItem(list, 0.5, 2)).toEqual(list)
  })

  it('no modifica la lista original', () => {
    moveCarouselItem(list, 0, 3)

    expect(list).toEqual(['a', 'b', 'c', 'd'])
  })

  it('conserva los mismos elementos (permutación)', () => {
    for (let from = 0; from < list.length; from++) {
      for (let to = -1; to <= list.length; to++) {
        expect([...moveCarouselItem(list, from, to)].sort()).toEqual(list)
      }
    }
  })
})

describe('isSameOrder', () => {
  it('compara ids y orden', () => {
    expect(isSameOrder(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(isSameOrder(['a', 'b'], ['b', 'a'])).toBe(false)
    expect(isSameOrder(['a'], ['a', 'b'])).toBe(false)
    expect(isSameOrder([], [])).toBe(true)
  })
})

describe('reconcileOrder', () => {
  it('sin borrador es el orden guardado', () => {
    expect(reconcileOrder(null, ['a', 'b'])).toEqual(['a', 'b'])
  })

  it('con borrador, lo respeta', () => {
    expect(reconcileOrder(['b', 'a'], ['a', 'b'])).toEqual(['b', 'a'])
  })

  it('descarta lo que ya no existe y añade al final lo nuevo', () => {
    expect(reconcileOrder(['c', 'b', 'a'], ['a', 'b', 'd'])).toEqual([
      'b',
      'a',
      'd',
    ])
  })
})
