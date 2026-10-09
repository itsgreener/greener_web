import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  IMAGE_LIMITS,
  VIDEO_LIMITS,
  PIN_ANIMATION_LIMITS,
  TOOL_PIN_VIDEO_LIMITS,
  canAnimateInFeed,
  pinVideoLimitsFor,
  validateImageFile,
  validateImageUpload,
  validateVideoUpload,
  validatePinAnimationUpload,
  validatePinVideoUpload,
} from '@/modules/media/domain/mediaLimits'

function ascii(value: string): number[] {
  return Array.from(value, (character) => character.charCodeAt(0))
}

function fakeFile({
  name,
  type,
  bytes,
  size,
}: {
  name: string
  type: string
  bytes: number[]
  size?: number
}) {
  const data = new Uint8Array(bytes)

  return {
    name,
    type,
    size: size ?? data.byteLength,

    async arrayBuffer(): Promise<ArrayBuffer> {
      return data.buffer as ArrayBuffer
    },
  }
}

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

describe('validateImageFile', () => {
  it('rechaza un GIF por MIME y extensión', async () => {
    const result = await validateImageFile(
      fakeFile({
        name: 'animation.gif',
        type: 'image/gif',
        bytes: ascii('GIF89a'),
      }),
    )

    expect(result).toEqual({
      code: 'GIF_NOT_ALLOWED',
    })
  })

  it('rechaza un GIF aunque haya sido renombrado como PNG', async () => {
    const result = await validateImageFile(
      fakeFile({
        name: 'foto.png',
        type: 'image/png',
        bytes: ascii('GIF89a fake data'),
      }),
    )

    expect(result).toEqual({
      code: 'GIF_NOT_ALLOWED',
    })
  })

  it('rechaza también un GIF87a renombrado', async () => {
    const result = await validateImageFile(
      fakeFile({
        name: 'foto.jpg',
        type: 'image/jpeg',
        bytes: ascii('GIF87a fake data'),
      }),
    )

    expect(result).toEqual({
      code: 'GIF_NOT_ALLOWED',
    })
  })

  it('rechaza un WebP animado cuando contiene el chunk ANIM', async () => {
    const result = await validateImageFile(
      fakeFile({
        name: 'animation.webp',
        type: 'image/webp',
        bytes: [
          ...ascii('RIFF'),
          0,
          0,
          0,
          0,
          ...ascii('WEBP'),
          ...ascii('ANIM'),
          0,
          0,
          0,
          0,
        ],
      }),
    )

    expect(result).toEqual({
      code: 'ANIMATED_IMAGE_NOT_ALLOWED',
      format: 'webp',
    })
  })

  it('rechaza un WebP animado cuando VP8X tiene activo el flag de animación', async () => {
    const bytes = [
      ...ascii('RIFF'),
      0,
      0,
      0,
      0,
      ...ascii('WEBP'),
      ...ascii('VP8X'),
      0,
      0,
      0,
      0,
      0x02,
      0,
      0,
      0,
    ]

    const result = await validateImageFile(
      fakeFile({
        name: 'animation.webp',
        type: 'image/webp',
        bytes,
      }),
    )

    expect(result).toEqual({
      code: 'ANIMATED_IMAGE_NOT_ALLOWED',
      format: 'webp',
    })
  })

  it('acepta un WebP estático', async () => {
    const result = await validateImageFile(
      fakeFile({
        name: 'foto.webp',
        type: 'image/webp',
        bytes: [
          ...ascii('RIFF'),
          0,
          0,
          0,
          0,
          ...ascii('WEBP'),
          ...ascii('VP8 '),
          0,
          0,
          0,
          0,
        ],
      }),
    )

    expect(result).toBeNull()
  })

  it('rechaza un PNG animado (APNG)', async () => {
    const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

    const result = await validateImageFile(
      fakeFile({
        name: 'animation.png',
        type: 'image/png',
        // Chunk real: longitud (8) + 'acTL' + 8 bytes de datos + CRC.
        bytes: [
          ...pngHeader,
          0,
          0,
          0,
          8,
          ...ascii('acTL'),
          ...new Array(8).fill(0),
          0,
          0,
          0,
          0,
        ],
      }),
    )

    expect(result).toEqual({
      code: 'ANIMATED_IMAGE_NOT_ALLOWED',
      format: 'png',
    })
  })

  it('auditoría 8 oct: un PNG estático con los bytes "acTL" dentro de IDAT NO se toma por animado', async () => {
    const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    const idatData = [1, 2, ...ascii('acTL'), 3, 4]

    const result = await validateImageFile(
      fakeFile({
        name: 'foto.png',
        type: 'image/png',
        bytes: [
          ...pngHeader,
          0,
          0,
          0,
          idatData.length,
          ...ascii('IDAT'),
          ...idatData,
          0,
          0,
          0,
          0,
        ],
      }),
    )

    expect(result).toBeNull()
  })

  it('auditoría 8 oct: un WebP estático con los bytes "ANIM" dentro de VP8 NO se toma por animado', async () => {
    const vp8Data = [1, 2, ...ascii('ANIM'), 3, 4]

    const result = await validateImageFile(
      fakeFile({
        name: 'foto.webp',
        type: 'image/webp',
        bytes: [
          ...ascii('RIFF'),
          0,
          0,
          0,
          0,
          ...ascii('WEBP'),
          ...ascii('VP8 '),
          vp8Data.length,
          0,
          0,
          0,
          ...vp8Data,
        ],
      }),
    )

    expect(result).toBeNull()
  })

  it('acepta un PNG estático', async () => {
    const result = await validateImageFile(
      fakeFile({
        name: 'foto.png',
        type: 'image/png',
        bytes: [
          0x89,
          0x50,
          0x4e,
          0x47,
          0x0d,
          0x0a,
          0x1a,
          0x0a,
          ...ascii('IHDR'),
        ],
      }),
    )

    expect(result).toBeNull()
  })

  it('rechaza un formato de imagen no permitido', async () => {
    const result = await validateImageFile(
      fakeFile({
        name: 'foto.bmp',
        type: 'image/bmp',
        bytes: [0x42, 0x4d],
      }),
    )

    expect(result).toEqual({
      code: 'IMAGE_FORMAT_NOT_ALLOWED',
    })
  })

  it('rechaza una extensión no permitida aunque el MIME parezca de imagen', async () => {
    const result = await validateImageFile(
      fakeFile({
        name: 'foto.tiff',
        type: 'image/jpeg',
        bytes: [0xff, 0xd8, 0xff],
      }),
    )

    expect(result).toEqual({
      code: 'IMAGE_FORMAT_NOT_ALLOWED',
    })
  })

  it('rechaza un MIME no permitido aunque la extensión sea válida', async () => {
    const result = await validateImageFile(
      fakeFile({
        name: 'foto.jpg',
        type: 'image/gif',
        bytes: [0xff, 0xd8, 0xff],
      }),
    )

    expect(result).toEqual({
      code: 'GIF_NOT_ALLOWED',
    })
  })

  it('comprueba el límite de 5 MB antes de analizar el contenido', async () => {
    const result = await validateImageFile(
      fakeFile({
        name: 'animation.gif',
        type: 'image/gif',
        bytes: ascii('GIF89a'),
        size: IMAGE_LIMITS.maxSizeBytes + 1,
      }),
    )

    expect(result).toEqual({
      code: 'IMAGE_TOO_LARGE',
      maxBytes: IMAGE_LIMITS.maxSizeBytes,
    })
  })
})

describe('límites de vídeo de pin por tipo de contenido (5 oct 2026)', () => {
  it('los pines de una tool admiten 15 s y 15 MB', () => {
    expect(pinVideoLimitsFor('tool')).toEqual({
      maxDurationSeconds: 15,
      maxSizeBytes: 15 * 1024 * 1024,
    })

    expect(validatePinVideoUpload('tool', 15 * 1024 * 1024, 15)).toBeNull()
  })

  it('el resto de pines mantienen 8 s y 100 MB', () => {
    for (const type of ['case', 'insight', 'episode', 'other']) {
      expect(pinVideoLimitsFor(type)).toEqual({
        maxDurationSeconds: 8,
        maxSizeBytes: VIDEO_LIMITS.maxSizeBytes,
      })
    }

    expect(validatePinVideoUpload('case', 50 * 1024 * 1024, 8)).toBeNull()
  })

  it('rechaza un vídeo de tool por encima de 15 s o de 15 MB', () => {
    expect(validatePinVideoUpload('tool', 1024, 16)).toEqual({
      code: 'ANIMATION_TOO_LONG',
      maxSeconds: 15,
    })

    expect(validatePinVideoUpload('tool', 15 * 1024 * 1024 + 1, 5)).toEqual({
      code: 'VIDEO_TOO_LARGE',
      maxBytes: 15 * 1024 * 1024,
    })
  })

  it('un vídeo de 10 s vale en una tool pero no en un caso', () => {
    expect(validatePinVideoUpload('tool', 1024, 10)).toBeNull()
    expect(validatePinVideoUpload('case', 1024, 10)?.code).toBe(
      'ANIMATION_TOO_LONG',
    )
  })

  it('canAnimateInFeed: hasta 8 s se anima; más, solo poster; sin dato, como siempre (se anima)', () => {
    expect(canAnimateInFeed(5)).toBe(true)
    expect(canAnimateInFeed(8)).toBe(true)
    expect(canAnimateInFeed(9)).toBe(false)
    expect(canAnimateInFeed(15)).toBe(false)
    expect(canAnimateInFeed(null)).toBe(true)
    expect(canAnimateInFeed(undefined)).toBe(true)
  })

  it('las constantes TypeScript coinciden con las de la migración SQL attach_pin_video', () => {
    const sql = readFileSync(
      resolve(
        __dirname,
        '../../../supabase/migrations/20261005090000_pin_video_limits_by_content_type.sql',
      ),
      'utf8',
    )

    expect(sql).toContain(
      `v_max_duration := ${TOOL_PIN_VIDEO_LIMITS.maxDurationSeconds};`,
    )
    expect(sql).toContain(
      `v_max_bytes := ${TOOL_PIN_VIDEO_LIMITS.maxSizeBytes};`,
    )
    expect(sql).toContain(
      `v_max_duration := ${PIN_ANIMATION_LIMITS.maxDurationSeconds};`,
    )
    expect(sql).toContain(`v_max_bytes := ${VIDEO_LIMITS.maxSizeBytes};`)
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

  it('acepta exactamente 8 segundos (PIN_ANIMATION_LIMITS.maxDurationSeconds)', () => {
    expect(
      validatePinAnimationUpload(
        2 * 1024 * 1024,
        PIN_ANIMATION_LIMITS.maxDurationSeconds,
      ),
    ).toBeNull()
  })

  it('rechaza más de 8 segundos con ANIMATION_TOO_LONG, no VIDEO_TOO_LONG', () => {
    const result = validatePinAnimationUpload(2 * 1024 * 1024, 9)

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
