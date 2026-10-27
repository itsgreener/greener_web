import { describe, expect, it } from 'vitest'

import { cx } from '@/lib/cx'

describe('cx', () => {
  it('une los nombres con un espacio', () => {
    expect(cx('a', 'b')).toBe('a b')
  })

  it('descarta falsos, nulos, indefinidos y cadenas vacías', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b')
  })

  it('no deja espacio final cuando la condición es falsa', () => {
    const visible = false

    expect(cx('video', visible && 'videoVisible')).toBe('video')
  })

  it('sin nombres devuelve una cadena vacía', () => {
    expect(cx()).toBe('')
  })
})
