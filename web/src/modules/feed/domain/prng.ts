/**
 * PRNG determinista (mulberry32): misma seed numérica siempre produce la
 * misma secuencia de floats en [0, 1). Rápido, sin dependencias, suficiente
 * para un algoritmo de mezcla no criptográfico (arquitectura §8, ADR-02.4).
 */
export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Hash determinista de una cadena a un entero de 32 bits (FNV-1a).
 * Permite derivar una seed numérica reproducible a partir de la seed de
 * sesión (string) combinada con una clave (id de caso, tipo de pool, ronda...).
 */
export function hashToSeed(...parts: (string | number)[]): number {
  const input = parts.join('::')
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Crea un Rng determinista a partir de la seed de sesión + una clave de contexto. */
export function deriveRng(seed: string, ...key: (string | number)[]): Rng {
  return mulberry32(hashToSeed(seed, ...key))
}

/** Entero aleatorio determinista en [0, max). */
export function randomInt(rng: Rng, max: number): number {
  if (max <= 0) return 0
  return Math.floor(rng() * max)
}
