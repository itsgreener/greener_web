import { describe, it, expect } from 'vitest'
import {
  IMAGE_LIMITS,
  VIDEO_LIMITS,
  validateImageUpload,
  validateVideoUpload,
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
