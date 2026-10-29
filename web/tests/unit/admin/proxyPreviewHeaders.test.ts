import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'

import { proxy } from '@/proxy'

/** SEC-ADM-D2: las páginas con `?preview=` no se cachean, no filtran el token en el Referer ni se indexan. */

function get(path: string, method = 'GET') {
  return proxy(
    new NextRequest(new URL(path, 'http://localhost:3000').toString(), {
      method,
    }),
  )
}

describe('proxy — páginas con enlace de preview', () => {
  it('añade no-store, no-referrer y noindex', async () => {
    const response = await get('/work/mi-caso?preview=token')

    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })

  it('sin ?preview deja la política de referrer global', async () => {
    const response = await get('/work/mi-caso')

    expect(response.headers.get('referrer-policy')).toBe(
      'strict-origin-when-cross-origin',
    )
    expect(response.headers.get('x-robots-tag')).toBeNull()
  })

  it('un POST con ?preview no cambia las cabeceras', async () => {
    const response = await get('/work/mi-caso?preview=token', 'POST')

    expect(response.headers.get('referrer-policy')).toBe(
      'strict-origin-when-cross-origin',
    )
  })
})
