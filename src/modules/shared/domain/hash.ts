/**
 * Hash FNV-1a de 32 bits de una cadena, sin signo. Determinista, sin
 * dependencias y apto para `domain/` (no usa `node:crypto`). No es
 * criptográfico ni pretende serlo.
 *
 * Lo comparten el PRNG del feed (`hashToSeed`, que de aquí saca la seed de
 * cada ronda) y el identificador del contrato de calentamiento de vídeos
 * (`warmContractId`, que se guarda en `media_asset.warmed_contract`). Cambiar
 * este algoritmo cambiaría el orden de todos los feeds y haría que cada
 * vídeo figure «sin calentar»: tests/unit/shared/hash.test.ts fija valores.
 */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
}
