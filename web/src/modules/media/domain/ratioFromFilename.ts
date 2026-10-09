import {
  closestClosedRatio,
  isPinRatioValue,
  mediaMatchesRatio,
} from './closestRatio'
import type { PinRatioValue } from '@/modules/shared/domain/ratio'
/**
 * Lee la proporción del nombre de archivo en el ABM (carga masiva de pines).
 *
 * Convención de nombres de Greener: `[nombre]-[proporción]-[tipo de medio].ext`,
 * con la proporción como `1x1`, `4x5`, `9x16`… o compacta: `11`, `45`, `916`.
 *
 * Reglas, pensadas para no inventar nada:
 *  1. Se separa el nombre (sin extensión) por `-`, `_` o espacios y se
 *     descartan los contadores numéricos del final (`-2`, `_3`, ` (2)`): un
 *     mismo nombre repetido para varias imágenes no cambia lo que hay antes
 *     (`elonmuskeizer-43-image-2.webp` se lee igual que `…-image.webp`).
 *  2. Si el penúltimo bloque (el que ocupa la proporción en la convención) es
 *     una proporción válida, en cualquiera de las dos formas, se usa.
 *  3. Si no, se usa el último bloque con forma explícita `AxB` válida, en
 *     cualquier posición (el `x` evita confundirlo con un número del nombre).
 *  4. Si no hay nada legible o no es una de las 7 proporciones cerradas
 *     (p. ej. `5x7`), devuelve `null` y el formulario no aplica nada.
 *
 * La forma compacta solo se admite en el penúltimo bloque a propósito: en
 * `caso-11-hero.jpg` el 11 podría ser un número de caso, pero en la posición
 * de la convención se lee como 1:1.
 */

const COMPACT: Record<string, PinRatioValue> = {
  '11': '1:1',
  '43': '4:3',
  '45': '4:5',
  '34': '3:4',
  '23': '2:3',
  '916': '9:16',
  '169': '16:9',
}

// Contador de copia al final del nombre: `2`, `(2)`.
const COUNTER = /^\(?\d+\)?$/

const EXPLICIT = /^(\d{1,2})[x×](\d{1,2})$/i

function parseToken(
  token: string,
  allowCompact: boolean,
): PinRatioValue | null {
  const explicit = EXPLICIT.exec(token)

  if (explicit) {
    const candidate = `${Number(explicit[1])}:${Number(explicit[2])}`

    return isPinRatioValue(candidate) ? candidate : null
  }

  if (allowCompact && token in COMPACT) {
    return COMPACT[token]
  }

  return null
}

export function ratioFromFilename(filename: string): PinRatioValue | null {
  const base = filename.replace(/\.[^.]+$/, '')
  const tokens = base.split(/[-_\s]+/).filter(Boolean)

  while (tokens.length > 2 && COUNTER.test(tokens[tokens.length - 1])) {
    tokens.pop()
  }

  if (tokens.length >= 2) {
    const conventional = parseToken(tokens[tokens.length - 2], true)

    if (conventional) return conventional
  }

  for (let i = tokens.length - 1; i >= 0; i--) {
    const explicit = parseToken(tokens[i], false)

    if (explicit) return explicit
  }

  return null
}

/**
 * Aviso (nunca bloqueo) cuando el ratio elegido para un archivo no encaja con
 * sus dimensiones reales: el pin se recortará con `object-fit: cover`.
 * Devuelve el texto o `null` si encaja (o si el ratio no es de los 7
 * cerrados o las dimensiones no son fiables). Si el ratio vino del nombre
 * del archivo, el mensaje lo dice, porque lo más probable es un nombre mal
 * puesto.
 */
export function ratioMismatchMessage(
  ratio: string,
  width: number,
  height: number,
  source: 'filename' | 'other',
): string | null {
  if (!isPinRatioValue(ratio) || !(height > 0)) return null

  if (mediaMatchesRatio(width, height, ratio)) return null

  const suggested = closestClosedRatio(width, height)

  return source === 'filename'
    ? `El nombre del archivo indica ${ratio}, pero mide ${width}×${height} (parecido a ${suggested}) y se verá recortado. Revisa el nombre del archivo o cambia el ratio a ${suggested}.`
    : `Su ratio real (${width}×${height}, parecido a ${suggested}) no es el del pin (${ratio}) y se verá recortado.`
}
