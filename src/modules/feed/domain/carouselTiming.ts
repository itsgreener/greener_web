import { PIN_ANIMATION_LIMITS } from '@/modules/media/domain/mediaLimits'

/**
 * Tiempos del carrusel de pines del feed (§2.150). Un solo sitio para ajustar
 * el ritmo sin tocar el componente.
 *
 * - Una imagen se queda `CAROUSEL_IMAGE_MS`.
 * - Un vídeo animable espera a que termine (un bucle), con un mínimo de
 *   `CAROUSEL_IMAGE_MS` para que un clip muy corto no pase a toda prisa y un
 *   máximo de lo que el feed anima (`PIN_ANIMATION_LIMITS`, 8 s).
 * - Un vídeo que el feed no anima (más largo que ese límite) se enseña como
 *   póster, así que cuenta como una imagen.
 */
export const CAROUSEL_IMAGE_MS = 4000

/** Retraso máximo del primer avance, repartido por tarjeta para que varias a la vez no cambien en el mismo instante. */
export const CAROUSEL_STAGGER_MAX_MS = 1500

/** Fracción de la tarjeta que debe verse para que el carrusel avance. */
export const CAROUSEL_VISIBLE_RATIO = 0.5

type SlideTiming = {
  kind: 'image' | 'video'
  durationSeconds?: number | null
}

/** Cuánto se queda una diapositiva antes de pasar a la siguiente. */
export function carouselSlideMs(slide: SlideTiming): number {
  if (slide.kind !== 'video') return CAROUSEL_IMAGE_MS

  const seconds = slide.durationSeconds

  if (seconds === null || seconds === undefined || !(seconds > 0)) {
    return CAROUSEL_IMAGE_MS
  }

  if (seconds > PIN_ANIMATION_LIMITS.maxDurationSeconds) {
    return CAROUSEL_IMAGE_MS
  }

  return Math.max(CAROUSEL_IMAGE_MS, Math.round(seconds * 1000))
}

/**
 * Desfase estable (0 … CAROUSEL_STAGGER_MAX_MS - 1) a partir de la clave de la
 * tarjeta: la misma tarjeta siempre arranca igual y dos distintas casi nunca.
 */
export function carouselStaggerMs(key: string): number {
  let hash = 0

  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }

  return hash % CAROUSEL_STAGGER_MAX_MS
}
