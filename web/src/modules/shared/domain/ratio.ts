import { z } from 'zod'

/**
 * Los 7 ratios cerrados de un pin y de una portada
 * (especificacion-final-formato-detalle.md §4; el 4:3 se añadió después de
 * los 6 iniciales y agrupa junto a 1:1 en el modelo de columnas del §2).
 * Es el mismo conjunto que el enum `pin_ratio` de Postgres:
 * tests/unit/shared/dbEnums.test.ts avisa si se desincronizan.
 */
export const pinRatioSchema = z.enum([
  '1:1',
  '4:3',
  '4:5',
  '3:4',
  '2:3',
  '9:16',
  '16:9',
])

export type PinRatioValue = z.infer<typeof pinRatioSchema>

/** Ancho / alto de cada ratio cerrado (16:9 → 1,78; 9:16 → 0,56). */
export const RATIO_DECIMAL_VALUE: Record<PinRatioValue, number> = {
  '1:1': 1 / 1,
  '4:3': 4 / 3,
  '4:5': 4 / 5,
  '3:4': 3 / 4,
  '2:3': 2 / 3,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
}

/**
 * `aspect-ratio` de CSS usa «ancho / alto»; los ratios del proyecto, «ancho:alto».
 * Es solo el cambio de sintaxis, no una lista de ratios.
 */
export function cssAspectRatio(ratio: string): string {
  const [width, height] = ratio.split(':')

  return `${width} / ${height}`
}
