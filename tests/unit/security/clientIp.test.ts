import { describe, expect, it } from 'vitest'
import { clientIpFromHeaders } from '@/lib/http/clientIpFromHeaders'

const headers = (init: Record<string, string>) => new Headers(init)

describe('clientIpFromHeaders (proxy de Dinahosting: añade la IP al final)', () => {
  it('con una sola IP devuelve esa', () => {
    expect(
      clientIpFromHeaders(headers({ 'x-forwarded-for': '83.44.136.168' })),
    ).toBe('83.44.136.168')
  })

  it('comprobación real del 14 oct: "1.2.3.4, <IP real>" → la IP real, no la falsificada', () => {
    expect(
      clientIpFromHeaders(
        headers({
          'x-forwarded-for': '1.2.3.4, 83.44.136.168',
          'x-real-ip': '83.44.136.168',
        }),
      ),
    ).toBe('83.44.136.168')
  })

  it('con varios valores falsificados sigue tomando el último', () => {
    expect(
      clientIpFromHeaders(
        headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2 , 83.44.136.168' }),
      ),
    ).toBe('83.44.136.168')
  })

  it('sin x-forwarded-for cae a x-real-ip', () => {
    expect(clientIpFromHeaders(headers({ 'x-real-ip': '83.44.136.168' }))).toBe(
      '83.44.136.168',
    )
  })

  it('sin ninguna de las dos devuelve null', () => {
    expect(clientIpFromHeaders(headers({}))).toBeNull()
  })
})
