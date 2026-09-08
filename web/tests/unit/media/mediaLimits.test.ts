import { describe, it, expect } from 'vitest'
import {
  IMAGE_LIMITS,
  VIDEO_LIMITS,
  PIN_ANIMATION_LIMITS,
  validateImageUpload,
  validateVideoUpload,
  validatePinAnimationUpload,
} from '@/modules/media/domain/mediaLimits'

describe('validateImageUpload', () => {
  it('acepta un tamaño por debajo del límite (5 MB)', () => {
    expect(validateImageUpload(IMAGE_LIMITS.maxSizeBytes - 1)).toBeNull()
  })

  it('acepta exactamente el límite', () => {
    expect(validateImageUpload(IMAGE_LIMITS.maxSizeBytes)).toBeNull()
  })

  it('rechaza un tamaño por encima del límite con el código IMAGE_TOO_LARGE', () => {
    const result = validateImageUpload(IMAGE_LIMITS.maxSizeBytes + 1)

    expect(result).toEqual({
      code: 'IMAGE_TOO_LARGE',
      maxBytes: IMAGE_LIMITS.maxSizeBytes,
    })
  })
})

describe('validateVideoUpload', () => {
  it('acepta un vídeo dentro de tamaño y duración', () => {
    expect(validateVideoUpload(10 * 1024 * 1024, 60)).toBeNull()
  })

  it('acepta exactamente los límites de tamaño y duración (100 MB / 180 s)', () => {
    expect(
      validateVideoUpload(
        VIDEO_LIMITS.maxSizeBytes,
        VIDEO_LIMITS.maxDurationSeconds,
      ),
    ).toBeNull()
  })

  it('rechaza por tamaño antes que por duración cuando ambos fallan', () => {
    const result = validateVideoUpload(
      VIDEO_LIMITS.maxSizeBytes + 1,
      VIDEO_LIMITS.maxDurationSeconds + 1,
    )

    expect(result?.code).toBe('VIDEO_TOO_LARGE')
  })

  it('rechaza un vídeo demasiado largo pero de tamaño válido, con VIDEO_TOO_LONG', () => {
    const result = validateVideoUpload(
      10 * 1024 * 1024,
      VIDEO_LIMITS.maxDurationSeconds + 1,
    )

    expect(result).toEqual({
      code: 'VIDEO_TOO_LONG',
      maxSeconds: VIDEO_LIMITS.maxDurationSeconds,
    })
  })
})

describe('validatePinAnimationUpload', () => {
  it('acepta una animación corta y ligera', () => {
    expect(validatePinAnimationUpload(2 * 1024 * 1024, 3)).toBeNull()
  })

  it('acepta exactamente 5 segundos (PIN_ANIMATION_LIMITS.maxDurationSeconds)', () => {
    expect(
      validatePinAnimationUpload(
        2 * 1024 * 1024,
        PIN_ANIMATION_LIMITS.maxDurationSeconds,
      ),
    ).toBeNull()
  })

  it('rechaza más de 5 segundos con ANIMATION_TOO_LONG, no VIDEO_TOO_LONG', () => {
    const result = validatePinAnimationUpload(2 * 1024 * 1024, 6)

    expect(result).toEqual({
      code: 'ANIMATION_TOO_LONG',
      maxSeconds: PIN_ANIMATION_LIMITS.maxDurationSeconds,
    })
  })

  it('rechaza por tamaño usando el límite general de vídeo (100 MB), no uno propio', () => {
    const result = validatePinAnimationUpload(VIDEO_LIMITS.maxSizeBytes + 1, 3)

    expect(result).toEqual({
      code: 'VIDEO_TOO_LARGE',
      maxBytes: VIDEO_LIMITS.maxSizeBytes,
    })
  })

  it('el tamaño se comprueba antes que la duración cuando ambos fallan', () => {
    const result = validatePinAnimationUpload(VIDEO_LIMITS.maxSizeBytes + 1, 10)

    expect(result?.code).toBe('VIDEO_TOO_LARGE')
  })
})
