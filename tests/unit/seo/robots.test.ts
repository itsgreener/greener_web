import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/env', () => ({
  env: { NEXT_PUBLIC_SITE_URL: 'https://itsgreener.com' },
}))

import robots from '@/app/robots'
import { TRAP_PATH } from '@/lib/botTraps'

describe('robots.txt', () => {
  const result = robots()
  const rules = Array.isArray(result.rules) ? result.rules : [result.rules]

  it('deja abierto el sitio a todos los bots educados', () => {
    expect(rules).toHaveLength(1)
    expect(rules[0].userAgent).toBe('*')
    expect(rules[0].allow).toBe('/')
  })

  it('cierra el ABM, la API, el callback de auth y el señuelo', () => {
    expect(rules[0].disallow).toEqual(
      expect.arrayContaining(['/admin', '/api/', '/auth', TRAP_PATH]),
    )
  })

  it('no cierra nada de lo que debe poder citarse', () => {
    const disallow = rules[0].disallow as string[]

    for (const open of ['/', '/work', '/tools', '/insights', '/channel']) {
      expect(disallow).not.toContain(open)
    }
  })

  it('apunta al sitemap', () => {
    expect(result.sitemap).toBe('https://itsgreener.com/sitemap.xml')
  })
})
