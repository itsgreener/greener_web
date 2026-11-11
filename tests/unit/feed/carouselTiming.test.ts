import { describe, expect, it } from 'vitest'
import {
  CAROUSEL_IMAGE_MS,
  CAROUSEL_STAGGER_MAX_MS,
  carouselSlideMs,
  carouselStaggerMs,
} from '@/modules/feed/domain/carouselTiming'

describe('carouselSlideMs', () => {
  it('una imagen se queda el tiempo fijo', () => {
    expect(carouselSlideMs({ kind: 'image' })).toBe(CAROUSEL_IMAGE_MS)
  })

  it('un vídeo animable espera su duración', () => {
    expect(carouselSlideMs({ kind: 'video', durationSeconds: 6.5 })).toBe(6500)
  })

  it('un vídeo muy corto no pasa por debajo del tiempo de una imagen', () => {
    expect(carouselSlideMs({ kind: 'video', durationSeconds: 1 })).toBe(
      CAROUSEL_IMAGE_MS,
    )
  })

  it('el máximo es lo que el feed anima (8 s); más largo cuenta como póster', () => {
    expect(carouselSlideMs({ kind: 'video', durationSeconds: 8 })).toBe(8000)
    expect(carouselSlideMs({ kind: 'video', durationSeconds: 15 })).toBe(
      CAROUSEL_IMAGE_MS,
    )
  })

  it.each([null, undefined, 0, -3, Number.NaN])(
    'un vídeo con duración desconocida (%s) cuenta como imagen',
    (durationSeconds) => {
      expect(carouselSlideMs({ kind: 'video', durationSeconds })).toBe(
        CAROUSEL_IMAGE_MS,
      )
    },
  )
})

describe('carouselStaggerMs', () => {
  it('es estable y está dentro del rango', () => {
    expect(carouselStaggerMs('card-1')).toBe(carouselStaggerMs('card-1'))

    for (const key of ['a', 'b', 'card-12', 'x'.repeat(200), '']) {
      const value = carouselStaggerMs(key)

      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(CAROUSEL_STAGGER_MAX_MS)
    }
  })

  it('reparte claves distintas en desfases distintos', () => {
    const values = new Set(
      Array.from({ length: 20 }, (_, i) => carouselStaggerMs(`pin-${i}:k`)),
    )

    expect(values.size).toBeGreaterThan(10)
  })
})
