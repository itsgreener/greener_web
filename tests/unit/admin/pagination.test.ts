import { describe, expect, it } from 'vitest'

import { pageCount, parsePage } from '@/modules/shared/domain/pagination'

describe('parsePage', () => {
  it.each([
    ['1', 1],
    ['2', 2],
    ['37', 37],
    ['3abc', 3],
  ])('«%s» → %i', (raw, expected) => {
    expect(parsePage(raw)).toBe(expected)
  })

  it.each([undefined, '', '0', '-4', 'abc', 'NaN'])(
    '%j cae a la página 1',
    (raw) => {
      expect(parsePage(raw)).toBe(1)
    },
  )
})

describe('pageCount', () => {
  it('un listado vacío tiene una página', () => {
    expect(pageCount(0, 25)).toBe(1)
  })

  it('redondea hacia arriba', () => {
    expect(pageCount(25, 25)).toBe(1)
    expect(pageCount(26, 25)).toBe(2)
    expect(pageCount(101, 50)).toBe(3)
  })
})
