import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TRAP_PATH, classifyBotTrap, logBotTrap } from '@/lib/botTraps'

describe('classifyBotTrap', () => {
  it('la ruta señuelo y lo que cuelgue de ella son trampa', () => {
    expect(classifyBotTrap(TRAP_PATH)).toBe('trap')
    expect(classifyBotTrap(`${TRAP_PATH}/2026.zip`)).toBe('trap')
  })

  it.each([
    '/wp-login.php',
    '/wp-admin/install.php',
    '/wp-content/plugins/x/readme.txt',
    '/xmlrpc.php',
    '/index.php',
    '/phpmyadmin/',
    '/cgi-bin/test',
    '/.env',
    '/.env.production',
    '/.git/config',
    '/.aws/credentials',
    '/.htaccess',
  ])('%s es una sonda de escáner', (path) => {
    expect(classifyBotTrap(path)).toBe('probe')
  })

  it.each([
    '/',
    '/work/mi-caso',
    '/tools/php-guide',
    '/insights/wp-admin-tips',
    '/channel',
    '/privacy',
    '/robots.txt',
    '/llms.txt',
    '/sitemap.xml',
    '/.well-known/security.txt',
    '/internal',
    '/internal/other',
    '/api/feed/sessions',
  ])('%s es una ruta legítima y no se toca', (path) => {
    expect(classifyBotTrap(path)).toBeNull()
  })
})

describe('logBotTrap', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('escribe una línea JSON con tipo, ruta, IP (la última de X-Forwarded-For, la que añade el proxy) y user-agent', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    logBotTrap('probe', {
      url: 'https://itsgreener.com/wp-login.php?x=1',
      headers: new Headers({
        'x-forwarded-for': '10.0.0.1, 203.0.113.7',
        'user-agent': 'EvilScanner/1.0',
      }),
    })

    expect(warn).toHaveBeenCalledTimes(1)
    expect(JSON.parse(warn.mock.calls[0][0] as string)).toEqual({
      event: 'bot-trap',
      kind: 'probe',
      path: '/wp-login.php',
      ip: '203.0.113.7',
      userAgent: 'EvilScanner/1.0',
    })
  })

  it('sin cabeceras no falla y recorta valores larguísimos', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    logBotTrap('trap', {
      url: 'https://itsgreener.com/internal/client-list',
      headers: new Headers({ 'user-agent': 'x'.repeat(1000) }),
    })

    const line = JSON.parse(warn.mock.calls[0][0] as string)
    expect(line.ip).toBe('-')
    expect(line.userAgent).toHaveLength(200)
  })

  it('tiene tope por minuto: un escáner no llena los logs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    for (let i = 0; i < 500; i += 1) {
      logBotTrap('probe', {
        url: 'https://itsgreener.com/x.php',
        headers: new Headers(),
      })
    }

    // El tope es 60 por minuto; los tests anteriores ya gastaron alguno.
    expect(warn.mock.calls.length).toBeLessThanOrEqual(60)
  })
})
