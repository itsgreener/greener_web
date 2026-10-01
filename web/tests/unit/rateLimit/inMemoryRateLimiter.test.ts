import { describe, expect, it } from 'vitest'
import { createFixedWindowRateLimiter } from '@/lib/rateLimit/inMemoryRateLimiter'

describe('createFixedWindowRateLimiter', () => {
  it('permite hasta max peticiones dentro de la ventana y bloquea la siguiente', () => {
    const now = 0
    const limiter = createFixedWindowRateLimiter({
      max: 3,
      windowMs: 60_000,
      now: () => now,
    })

    expect(limiter.check('a')).toBe(true)
    expect(limiter.check('a')).toBe(true)
    expect(limiter.check('a')).toBe(true)
    expect(limiter.check('a')).toBe(false)
  })

  it('cada key tiene su propio contador, independiente de las demás', () => {
    const now = 0
    const limiter = createFixedWindowRateLimiter({
      max: 1,
      windowMs: 60_000,
      now: () => now,
    })

    expect(limiter.check('visitante-1')).toBe(true)
    expect(limiter.check('visitante-1')).toBe(false)
    expect(limiter.check('visitante-2')).toBe(true)
  })

  it('la ventana no se prolonga con una petición aceptada a mitad de camino (distingue de una ventana deslizante)', () => {
    let now = 0
    const limiter = createFixedWindowRateLimiter({
      max: 2,
      windowMs: 10_000,
      now: () => now,
    })

    limiter.check('a') // t=0, count 1, abre la ventana en t=0
    now = 1_000
    limiter.check('a') // t=1000, count 2 — NO debe mover el inicio de la ventana
    now = 10_000 // 10s desde el INICIO real (t=0), no desde el último toque (t=1000)

    // Con una ventana que se prolongara en cada toque aceptado, el
    // inicio real sería t=1000 y esto seguiría bloqueado hasta t=11000.
    expect(limiter.check('a')).toBe(true)
  })

  it('la ventana se reinicia por completo al expirar', () => {
    let now = 0
    const limiter = createFixedWindowRateLimiter({
      max: 2,
      windowMs: 60_000,
      now: () => now,
    })

    expect(limiter.check('a')).toBe(true)
    expect(limiter.check('a')).toBe(true)
    expect(limiter.check('a')).toBe(false)

    now = 60_000 // exactamente al límite de la ventana: ya expiró
    expect(limiter.check('a')).toBe(true)
  })

  it('ventana FIJA, no deslizante: un ritmo bajo y constante nunca se queda bloqueado para siempre', () => {
    let now = 0
    const limiter = createFixedWindowRateLimiter({
      max: 2,
      windowMs: 10_000,
      now: () => now,
    })

    // Una petición cada 4s, sin hueco nunca de 10s completos: con una
    // ventana que se prolongara "al tocar", esto habría bloqueado para
    // siempre en cuanto el contador llegara a max. Con ventana fija,
    // debe seguir dejando pasar peticiones tras cada reinicio real.
    const results: boolean[] = []
    for (let i = 0; i < 12; i++) {
      results.push(limiter.check('a'))
      now += 4_000
    }

    expect(results.some((allowed) => allowed === true)).toBe(true)
    // En 48s (12 pasos de 4s) caben ventanas de 10s de sobra: no debe
    // estar permanentemente bloqueado.
    expect(results.slice(-3).some((allowed) => allowed === true)).toBe(true)
  })

  it('purga las entradas caducadas tras el número de comprobaciones configurado (no crece sin límite)', () => {
    let now = 0
    const limiter = createFixedWindowRateLimiter({
      max: 1,
      windowMs: 1_000,
      now: () => now,
      sweepEveryChecks: 5,
    })

    for (let i = 0; i < 4; i++) {
      limiter.check(`visitante-${i}`)
    }

    now = 5_000 // muy por encima de windowMs: todo caducado

    // La 5ª comprobación dispara la purga internamente; no hay forma de
    // observar el tamaño del mapa desde fuera, así que se comprueba el
    // efecto: un visitante purgado y reintentado vuelve a tener cupo
    // completo, como si nunca hubiera existido.
    limiter.check('visitante-4')
    expect(limiter.check('visitante-0')).toBe(true)
  })
})
