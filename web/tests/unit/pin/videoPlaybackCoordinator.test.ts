import { describe, it, expect } from 'vitest'
import {
  VideoPlaybackCoordinator,
  getVideoSlotLimit,
} from '@/components/pin/videoPlaybackCoordinator'

const DESKTOP = 1440
const MOBILE = 375

function make(width = DESKTOP) {
  return new VideoPlaybackCoordinator(() => width)
}

/** Registra una tarjeta en los dos presupuestos y devuelve sus estados vivos. */
function addCard(
  c: VideoPlaybackCoordinator,
  id: string,
  opts: {
    visibleRatio?: number
    distanceToCenter?: number
    eligible?: boolean
    distanceToViewport?: number
  } = {},
) {
  const state = { slot: false, ticket: false, slotCalls: 0, ticketCalls: 0 }

  c.register(id, (a) => {
    state.slot = a
    state.slotCalls++
  })
  c.registerPrefetch(id, (t) => {
    state.ticket = t
    state.ticketCalls++
  })
  c.update(id, opts.visibleRatio ?? 0, opts.distanceToCenter ?? 0)
  c.updatePrefetch(id, {
    eligible: opts.eligible ?? true,
    distanceToViewport: opts.distanceToViewport ?? 0,
    distanceToCenter: opts.distanceToCenter ?? 0,
  })

  return state
}

describe('VideoPlaybackCoordinator — huecos de reproducción (sin cambios)', () => {
  it('2 en escritorio y 1 en móvil', () => {
    expect(getVideoSlotLimit(DESKTOP)).toBe(2)
    expect(getVideoSlotLimit(MOBILE)).toBe(1)
  })

  it('el más visible gana el hueco; a igual visibilidad, el más cercano al centro', () => {
    const c = make()
    const a = addCard(c, 'a', { visibleRatio: 1, distanceToCenter: 300 })
    const b = addCard(c, 'b', { visibleRatio: 1, distanceToCenter: 100 })
    const d = addCard(c, 'd', { visibleRatio: 0.5, distanceToCenter: 0 })

    expect([a.slot, b.slot, d.slot]).toEqual([true, true, false])
  })

  it('en móvil solo hay un hueco', () => {
    const c = make(MOBILE)
    const a = addCard(c, 'a', { visibleRatio: 1, distanceToCenter: 10 })
    const b = addCard(c, 'b', { visibleRatio: 1, distanceToCenter: 20 })

    expect([a.slot, b.slot]).toEqual([true, false])
  })

  it('un candidato sin visibilidad nunca tiene hueco', () => {
    const c = make()
    const a = addCard(c, 'a', { visibleRatio: 0 })

    expect(a.slot).toBe(false)
  })
})

describe('VideoPlaybackCoordinator — billetes de prefetch (contrato §6.2)', () => {
  it('3 billetes en escritorio: los 3 más cercanos al viewport', () => {
    const c = make()
    const cards = ['a', 'b', 'c', 'd', 'e'].map((id, i) =>
      addCard(c, id, { distanceToViewport: i * 100 }),
    )

    expect(cards.map((s) => s.ticket)).toEqual([true, true, true, false, false])
  })

  it('2 billetes en móvil (<640 px)', () => {
    const c = make(MOBILE)
    const cards = ['a', 'b', 'c', 'd'].map((id, i) =>
      addCard(c, id, { distanceToViewport: i * 100 }),
    )

    expect(cards.map((s) => s.ticket)).toEqual([true, true, false, false])
  })

  it('una tarjeta no elegible (fuera de la ventana de prefetch) nunca tiene billete', () => {
    const c = make()
    const far = addCard(c, 'far', { eligible: false, distanceToViewport: 0 })

    expect(far.ticket).toBe(false)
  })

  it('un vídeo con hueco de reproducción SIEMPRE tiene billete, aunque haya otros más cercanos', () => {
    const c = make()
    // Tres tarjetas pegadas al viewport (sin hueco)...
    addCard(c, 'n1', { distanceToViewport: 0, visibleRatio: 0 })
    addCard(c, 'n2', { distanceToViewport: 0, visibleRatio: 0 })
    addCard(c, 'n3', { distanceToViewport: 0, visibleRatio: 0 })
    // ...y una visible que consigue el hueco, aunque «más lejos» en distancia.
    const playing = addCard(c, 'playing', {
      visibleRatio: 1,
      distanceToViewport: 500,
    })

    expect(playing.slot).toBe(true)
    expect(playing.ticket).toBe(true)
  })

  it('con 2 huecos y 3 billetes, quien suena ocupa 2 y queda 1 para el más cercano', () => {
    const c = make()
    const s1 = addCard(c, 's1', { visibleRatio: 1, distanceToViewport: 0 })
    const s2 = addCard(c, 's2', { visibleRatio: 0.9, distanceToViewport: 0 })
    const near = addCard(c, 'near', { distanceToViewport: 50 })
    const far = addCard(c, 'far', { distanceToViewport: 900 })

    expect([s1.slot, s2.slot]).toEqual([true, true])
    expect([s1.ticket, s2.ticket, near.ticket, far.ticket]).toEqual([
      true,
      true,
      true,
      false,
    ])
  })

  it('el total de billetes nunca supera el límite (3 escritorio / 2 móvil), pase lo que pase', () => {
    for (const [width, limit] of [
      [DESKTOP, 3],
      [MOBILE, 2],
    ] as const) {
      const c = make(width)
      const cards = Array.from({ length: 30 }, (_, i) =>
        addCard(c, `p${i}`, {
          visibleRatio: i % 4 === 0 ? 1 : 0,
          distanceToViewport: (i * 37) % 800,
          distanceToCenter: (i * 53) % 600,
        }),
      )

      expect(cards.filter((s) => s.ticket).length).toBeLessThanOrEqual(limit)
    }
  })

  it('al quitar una tarjeta con billete, el siguiente más cercano lo recibe', () => {
    const c = make()
    const unregister = (() => {
      // addCard no devuelve los unregister: se registra a mano la primera.
      const state = { ticket: false }
      const off = c.registerPrefetch('a', (t) => (state.ticket = t))
      c.updatePrefetch('a', {
        eligible: true,
        distanceToViewport: 0,
        distanceToCenter: 0,
      })
      return { state, off }
    })()
    const b = addCard(c, 'b', { distanceToViewport: 10 })
    const d = addCard(c, 'd', { distanceToViewport: 20 })
    const e = addCard(c, 'e', { distanceToViewport: 30 })

    expect([unregister.state.ticket, b.ticket, d.ticket, e.ticket]).toEqual([
      true,
      true,
      true,
      false,
    ])

    unregister.off()

    expect([b.ticket, d.ticket, e.ticket]).toEqual([true, true, true])
    expect(c.hasTicket('a')).toBe(false)
  })

  it('perder la elegibilidad (sale de la ventana) libera el billete', () => {
    const c = make()
    const a = addCard(c, 'a', { distanceToViewport: 0 })

    expect(a.ticket).toBe(true)

    c.updatePrefetch('a', {
      eligible: false,
      distanceToViewport: 3000,
      distanceToCenter: 3000,
    })

    expect(a.ticket).toBe(false)
  })

  it('solo avisa a quien cambia: un empate no hace bailar el billete entre dos tarjetas', () => {
    const c = make()
    const cards = ['a', 'b', 'c', 'd'].map((id) =>
      addCard(c, id, { distanceToViewport: 100, distanceToCenter: 100 }),
    )
    const before = cards.map((s) => s.ticket)
    const callsBefore = cards.map((s) => s.ticketCalls)

    // Misma situación recalculada varias veces (scroll sin cambios reales).
    for (let i = 0; i < 5; i++) {
      c.updatePrefetch('d', {
        eligible: true,
        distanceToViewport: 100,
        distanceToCenter: 100,
      })
    }

    expect(cards.map((s) => s.ticket)).toEqual(before)
    expect(cards.map((s) => s.ticketCalls)).toEqual(callsBefore)
  })

  it('el desempate es estable (por id): siempre gana el mismo', () => {
    const c = make()
    const cards = ['d', 'b', 'a', 'c'].map((id) =>
      addCard(c, id, { distanceToViewport: 100, distanceToCenter: 100 }),
    )

    // ids a, b, c ganan; d (el último por id) se queda sin billete.
    expect(cards.map((s) => s.ticket)).toEqual([false, true, true, true])
  })

  it('hasSlot y hasTicket reflejan el estado vivo', () => {
    const c = make()
    addCard(c, 'a', { visibleRatio: 1, distanceToViewport: 0 })

    expect(c.hasSlot('a')).toBe(true)
    expect(c.hasTicket('a')).toBe(true)
    expect(c.hasSlot('zzz')).toBe(false)
    expect(c.hasTicket('zzz')).toBe(false)
  })

  it('actualizar o quitar un id desconocido no lanza', () => {
    const c = make()

    expect(() =>
      c.updatePrefetch('nada', {
        eligible: true,
        distanceToViewport: 0,
        distanceToCenter: 0,
      }),
    ).not.toThrow()
    expect(() => c.update('nada', 1, 0)).not.toThrow()
  })
})
