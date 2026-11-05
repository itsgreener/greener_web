import { describe, it, expect } from 'vitest'

import {
  CONTENT_PAGE_SIZE,
  contentPageCount,
  parseContentListQuery,
} from '@/modules/content/domain/contentListQuery'

describe('parseContentListQuery', () => {
  it('sin parámetros: primera página, sin filtros', () => {
    expect(parseContentListQuery({})).toEqual({
      q: '',
      type: undefined,
      status: undefined,
      page: 1,
      pageSize: CONTENT_PAGE_SIZE,
    })
  })

  it('acepta tipo, estado y página válidos', () => {
    expect(
      parseContentListQuery({ type: 'tool', status: 'draft', page: '3' }),
    ).toMatchObject({ type: 'tool', status: 'draft', page: 3 })
  })

  it('ignora un tipo, un estado o una página que no existen', () => {
    expect(
      parseContentListQuery({ type: 'video', status: 'archived', page: '-2' }),
    ).toMatchObject({ type: undefined, status: undefined, page: 1 })
    expect(parseContentListQuery({ page: 'abc' }).page).toBe(1)
    expect(parseContentListQuery({ page: '0' }).page).toBe(1)
  })

  it('quita lo que tiene significado en ilike y en la sintaxis or() de PostgREST', () => {
    expect(parseContentListQuery({ q: '  50%_off,(x)"*\\ ' }).q).toBe(
      '50 off x',
    )
  })

  it('acota el texto de búsqueda', () => {
    expect(parseContentListQuery({ q: 'a'.repeat(500) }).q).toHaveLength(100)
  })
})

describe('contentPageCount', () => {
  it('siempre hay al menos una página', () => {
    expect(contentPageCount(0, 25)).toBe(1)
  })

  it('redondea hacia arriba', () => {
    expect(contentPageCount(25, 25)).toBe(1)
    expect(contentPageCount(26, 25)).toBe(2)
  })
})
