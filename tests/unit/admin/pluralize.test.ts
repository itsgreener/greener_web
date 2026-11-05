import { describe, expect, it } from 'vitest'

import { pluralize } from '@/app/admin/_lib/pluralize'

describe('pluralize', () => {
  it('singular solo con 1', () => {
    expect(pluralize(1, 'contenido', 'contenidos')).toBe('contenido')
  })

  it('plural con 0 y con más de 1', () => {
    expect(pluralize(0, 'contenido', 'contenidos')).toBe('contenidos')
    expect(pluralize(2, 'contenido', 'contenidos')).toBe('contenidos')
  })
})
