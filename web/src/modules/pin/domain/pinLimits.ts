/**
 * Máximo de pines por contenido (todos los tipos). Lo impone la base de
 * datos (trigger `pin_max_per_content`, migración 20261007120000); esta
 * constante solo permite al ABM avisar antes de intentar el alta.
 */
export const MAX_PINS_PER_CONTENT = 8

export function remainingPinSlots(currentPinCount: number): number {
  return Math.max(0, MAX_PINS_PER_CONTENT - currentPinCount)
}
