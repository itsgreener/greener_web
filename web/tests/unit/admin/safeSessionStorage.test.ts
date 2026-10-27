// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  readSession,
  removeSession,
  writeSession,
} from '@/app/admin/_lib/safeSessionStorage'

afterEach(() => {
  vi.restoreAllMocks()
  window.sessionStorage.clear()
})

describe('safeSessionStorage', () => {
  it('guarda, lee y borra', () => {
    writeSession('k', 'v')
    expect(readSession('k')).toBe('v')

    removeSession('k')
    expect(readSession('k')).toBeNull()
  })

  it('si el almacenamiento lanza, no rompe la pantalla', () => {
    const boom = () => {
      throw new DOMException('bloqueado', 'SecurityError')
    }

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(boom)

    expect(readSession('k')).toBeNull()
    expect(() => writeSession('k', 'v')).not.toThrow()
    expect(() => removeSession('k')).not.toThrow()
  })
})
