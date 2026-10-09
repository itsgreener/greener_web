import { describe, expect, it } from 'vitest'

import { hashToSeed } from '@/modules/feed/domain/prng'
import { fnv1a32 } from '@/modules/shared/domain/hash'
import { warmContractId } from '@/modules/media/domain/warmPlan'

/**
 * Fase 2: el hash FNV-1a estaba copiado en `prng.ts` y en `warmPlan.ts` y
 * ahora vive en `shared/domain/hash.ts`. Estos valores se calcularon con las
 * dos implementaciones ANTERIORES (daban lo mismo): si cambian, cambia el
 * orden de todos los feeds y cada vídeo vuelve a figurar «sin calentar».
 */
describe('fnv1a32', () => {
  it.each([
    ['', 2166136261],
    ['a', 3826002220],
    ['seed::case-1::3', 79610787],
    ['Ñandú ✓ vídeo', 1804900811],
    ['x'.repeat(500), 573638933],
  ])('%j → %i', (input, expected) => {
    expect(fnv1a32(input)).toBe(expected)
  })

  it('siempre devuelve un entero de 32 bits sin signo', () => {
    for (const input of ['', 'a', 'zzzz', 'ñ'.repeat(40)]) {
      const hash = fnv1a32(input)

      expect(Number.isInteger(hash)).toBe(true)
      expect(hash).toBeGreaterThanOrEqual(0)
      expect(hash).toBeLessThan(2 ** 32)
    }
  })
})

describe('usuarios del hash', () => {
  it('hashToSeed une las partes con «::» y no cambia su resultado', () => {
    expect(hashToSeed('seed', 42, 'tools')).toBe(378700185)
    expect(hashToSeed('seed', 'case-1', 3)).toBe(fnv1a32('seed::case-1::3'))
  })

  it('warmContractId es estable y usa el hash hacia delante y hacia atrás', () => {
    const id = warmContractId(['c_fill,w_400', 'q_auto'])

    expect(id).toMatch(/^w1-[0-9a-f]{16}$/)
    expect(warmContractId(['q_auto', 'c_fill,w_400'])).toBe(id)

    const text = ['c_fill,w_400', 'q_auto'].join('\n')
    const forward = fnv1a32(text).toString(16).padStart(8, '0')
    const backward = fnv1a32([...text].reverse().join(''))
      .toString(16)
      .padStart(8, '0')

    expect(id).toBe(`w1-${forward}${backward}`)
  })
})
