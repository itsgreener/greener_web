import { pinRatioSchema } from '@/modules/pin/domain/pinSchema'

/**
 * Sugerencia automática del campo `ratio` de una portada
 * (especificacion-final-formato-detalle.md §2, §4) a partir de las
 * dimensiones reales del archivo que se acaba de elegir en el ABM — el
 * admin sigue pudiendo cambiarla a mano antes de subir, esto solo
 * precarga el `<select>` con la opción más parecida, nunca decide por su
 * cuenta ni se guarda en servidor sin que el admin lo confirme.
 *
 * Comparar por diferencia absoluta de ancho/alto sesga hacia los ratios
 * "grandes" (1,78 de 16:9 absorbe más rango que 0,5625 de 9:16 aunque
 * ambos representen el mismo "grado de apaisado/vertical" en sentidos
 * opuestos) porque los ratios no son una escala lineal, son una relación
 * multiplicativa. Comparar en escala logarítmica corrige ese sesgo: la
 * distancia entre 16:9 y 1:1 en log-espacio es la misma que entre 1:1 y
 * 9:16, aunque en valor absoluto 16:9-1:1 (0,78) y 1:1-9:16 (0,44) no se
 * parezcan nada.
 */

type PinRatioValue = (typeof pinRatioSchema.options)[number]

const RATIO_DECIMAL_VALUE: Record<PinRatioValue, number> = {
  '1:1': 1 / 1,
  '4:3': 4 / 3,
  '4:5': 4 / 5,
  '3:4': 3 / 4,
  '2:3': 2 / 3,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
}

export function closestClosedRatio(
  width: number,
  height: number,
): PinRatioValue {
  if (!Number.isFinite(width) || !Number.isFinite(height) || height <= 0) {
    throw new Error(
      `Dimensiones inválidas para sugerir ratio: width=${width}, height=${height}`,
    )
  }

  const actualRatio = width / height
  const logActual = Math.log(actualRatio)

  let closest: PinRatioValue = pinRatioSchema.options[0]
  let closestDistance = Infinity

  for (const candidate of pinRatioSchema.options) {
    const distance = Math.abs(
      logActual - Math.log(RATIO_DECIMAL_VALUE[candidate]),
    )
    if (distance < closestDistance) {
      closestDistance = distance
      closest = candidate
    }
  }

  return closest
}

/**
 * Ratio fijo de todo el carrusel de detalle de un caso (tipo B —
 * especificacion-final-formato-detalle.md §1, §3), decidido en la sesión
 * del 21 de septiembre: se usa el ratio de la imagen/vídeo MÁS ANCHO del
 * carrusel (el de mayor width/height) para todas las diapositivas por
 * igual, y el resto se encaja dentro de esa ventana con barras negras
 * (`object-fit: contain`) en vez de recortarlas.
 *
 * Deliberadamente NO se recalcula por diapositiva: el ratio se calcula
 * UNA VEZ a partir de todos los medios del carrusel (server-side, antes
 * de renderizar) y se queda fijo mientras se navega entre slides — mover
 * la caja de texto en cada cambio de slide porque cada imagen tiene un
 * ratio distinto no tiene sentido visual y se descartó a propósito.
 */
export function widestCarouselRatio(
  media: { width: number; height: number }[],
): PinRatioValue {
  if (media.length === 0) {
    throw new Error(
      'widestCarouselRatio necesita al menos un medio — un carrusel de caso siempre trae 1-N (especificacion-final-formato-detalle.md §3).',
    )
  }

  let widest = media[0]
  let widestActualRatio = widest.width / widest.height

  for (const item of media.slice(1)) {
    const actualRatio = item.width / item.height
    if (actualRatio > widestActualRatio) {
      widest = item
      widestActualRatio = actualRatio
    }
  }

  return closestClosedRatio(widest.width, widest.height)
}
