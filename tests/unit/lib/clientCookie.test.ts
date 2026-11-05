// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { readBrowserCookie } from '@/lib/clientCookie'

function clearCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0].trim()
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  clearCookies()
})

describe('readBrowserCookie', () => {
  it('devuelve el valor de la cookie pedida entre varias', () => {
    document.cookie = 'otra=1; Path=/'
    document.cookie = 'greener_consent=abc; Path=/'
    document.cookie = 'ultima=2; Path=/'

    expect(readBrowserCookie('greener_consent')).toBe('abc')
  })

  it('conserva los `=` del valor', () => {
    document.cookie = 'token=a=b==; Path=/'

    expect(readBrowserCookie('token')).toBe('a=b==')
  })

  it('devuelve null si la cookie no existe', () => {
    document.cookie = 'otra=1; Path=/'

    expect(readBrowserCookie('greener_consent')).toBeNull()
  })

  it('no confunde una cookie con otra cuyo nombre empieza igual', () => {
    document.cookie = 'greener_consent_old=viejo; Path=/'

    expect(readBrowserCookie('greener_consent')).toBeNull()
  })

  it('devuelve el valor vacío de una cookie sin valor', () => {
    document.cookie = 'vacia=; Path=/'

    expect(readBrowserCookie('vacia')).toBe('')
  })

  it('devuelve null sin `document` (render en servidor)', () => {
    vi.stubGlobal('document', undefined)

    expect(readBrowserCookie('greener_consent')).toBeNull()
  })

  it('devuelve null si el navegador bloquea las cookies y lanza al leerlas', () => {
    vi.spyOn(Document.prototype, 'cookie', 'get').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    expect(readBrowserCookie('greener_consent')).toBeNull()
  })
})
