import { describe, expect, it } from 'vitest'

import { buildListHref, buildListQuery } from '@/app/admin/_lib/listHref'

describe('buildListHref', () => {
  it('sin filtros ni página devuelve la ruta base', () => {
    expect(buildListHref('/admin/contents', { q: '', type: '' }, 1)).toBe(
      '/admin/contents',
    )
  })

  it('añade solo los filtros con valor, en el orden en que llegan', () => {
    expect(
      buildListHref(
        '/admin/contents',
        { q: 'agro', type: undefined, status: 'draft' },
        1,
      ),
    ).toBe('/admin/contents?q=agro&status=draft')
  })

  it('la primera página no lleva `page` y la segunda sí', () => {
    expect(buildListHref('/admin/talent', { q: '' }, 1)).toBe('/admin/talent')
    expect(buildListHref('/admin/talent', { q: '' }, 2)).toBe(
      '/admin/talent?page=2',
    )
  })

  it('`page` va después de los filtros', () => {
    expect(
      buildListHref('/admin/audit', { q: 'login', entity: 'content' }, 3),
    ).toBe('/admin/audit?q=login&entity=content&page=3')
  })

  it('codifica los valores', () => {
    expect(buildListHref('/admin/contents', { q: 'a b&c' }, 1)).toBe(
      '/admin/contents?q=a+b%26c',
    )
  })
})

describe('buildListQuery', () => {
  it('sin filtros ni página, cadena vacía', () => {
    expect(buildListQuery({ q: '', type: undefined }, 1)).toBe('')
  })

  it('filtros con valor y `page` al final, sin `?`', () => {
    expect(buildListQuery({ q: 'a b', status: 'draft' }, 2)).toBe(
      'q=a+b&status=draft&page=2',
    )
  })
})
