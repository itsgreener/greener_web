import { describe, it, expect } from 'vitest'
import {
  mulberry32,
  hashToSeed,
  deriveRng,
  randomInt,
} from '@/modules/feed/domain/prng'

describe('mulberry32', () => {
  it('misma seed produce siempre la misma secuencia', () => {
    const seqA = Array.from({ length: 10 }, mulberry32(42))
    const seqB = Array.from({ length: 10 }, mulberry32(42))
    expect(seqA).toEqual(seqB)
  })

  it('seeds distintas producen secuencias distintas', () => {
    const rngA = mulberry32(1)
    const rngB = mulberry32(2)
    const seqA = Array.from({ length: 10 }, () => rngA())
    const seqB = Array.from({ length: 10 }, () => rngB())
    expect(seqA).not.toEqual(seqB)
  })

  it('produce siempre valores en [0, 1)', () => {
    const rng = mulberry32(12345)
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('hashToSeed', () => {
  it('es determinista para las mismas partes', () => {
    expect(hashToSeed('session-1', 'case-42', 3)).toBe(
      hashToSeed('session-1', 'case-42', 3),
    )
  })

  it('entradas distintas producen hashes distintos (con altísima probabilidad)', () => {
    expect(hashToSeed('session-1', 'case-42')).not.toBe(
      hashToSeed('session-1', 'case-43'),
    )
  })
})

describe('deriveRng', () => {
  it('misma seed + misma clave de contexto => mismo stream', () => {
    const a = deriveRng('seed-x', 'mix', 0)
    const b = deriveRng('seed-x', 'mix', 0)
    expect(a()).toBe(b())
  })

  it('misma seed + distinta clave de contexto => streams independientes', () => {
    const a = deriveRng('seed-x', 'mix', 0)
    const b = deriveRng('seed-x', 'mix', 1)
    expect(a()).not.toBe(b())
  })
})

describe('randomInt', () => {
  it('siempre cae en [0, max)', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 500; i++) {
      const v = randomInt(rng, 5)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(5)
    }
  })

  it('max<=0 devuelve 0 sin lanzar', () => {
    const rng = mulberry32(7)
    expect(randomInt(rng, 0)).toBe(0)
  })
})
