import { describe, expect, it } from 'vitest'

import {
  IMAGE_LIMITS,
  VIDEO_LIMITS,
  PIN_ANIMATION_LIMITS,
  validateImageFile,
  validateImageUpload,
  validateVideoUpload,
  validatePinAnimationUpload,
} from '@/modules/media/domain/mediaLimits'

function ascii(value: string): number[] {
  return Array.from(
    value,
    (character) => character.charCodeAt(0),
  )
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
    expect(
      validateImageUpload(
        IMAGE_LIMITS.maxSizeBytes - 1,
      ),
    ).toBeNull()
  })

  it('acepta exactamente el límite', () => {
    expect(
      validateImageUpload(
        IMAGE_LIMITS.maxSizeBytes,
      ),
    ).toBeNull()
  })

  it('rechaza un tamaño por encima del límite con el código IMAGE_TOO_LARGE', () => {
    const result = validateImageUpload(
      IMAGE_LIMITS.maxSizeBytes + 1,
    )

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
    const pngHeader = [
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
    ]

    const result = await validateImageFile(
      fakeFile({
        name: 'animation.png',
        type: 'image/png',
        bytes: [
          ...pngHeader,
          ...ascii('acTL'),
        ],
      }),
    )

    expect(result).toEqual({
      code: 'ANIMATED_IMAGE_NOT_ALLOWED',
      format: 'png',
    })
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
        bytes: [
          0x42,
          0x4d,
        ],
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
        bytes: [
          0xff,
          0xd8,
          0xff,
        ],
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
        bytes: [
          0xff,
          0xd8,
          0xff,
        ],
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

describe('validateVideoUpload', () => {
  it('acepta un vídeo dentro de tamaño y duración', () => {
    expect(
      validateVideoUpload(
        10 * 1024 * 1024,
        60,
      ),
    ).toBeNull()
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

    expect(result?.code).toBe(
      'VIDEO_TOO_LARGE',
    )
  })

  it('rechaza un vídeo demasiado largo pero de tamaño válido, con VIDEO_TOO_LONG', () => {
    const result = validateVideoUpload(
      10 * 1024 * 1024,
      VIDEO_LIMITS.maxDurationSeconds + 1,
    )

    expect(result).toEqual({
      code: 'VIDEO_TOO_LONG',
      maxSeconds:
        VIDEO_LIMITS.maxDurationSeconds,
    })
  })
})

describe('validatePinAnimationUpload', () => {
  it('acepta una animación corta y ligera', () => {
    expect(
      validatePinAnimationUpload(
        2 * 1024 * 1024,
        3,
      ),
    ).toBeNull()
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
    const result =
      validatePinAnimationUpload(
        2 * 1024 * 1024,
        6,
      )

    expect(result).toEqual({
      code: 'ANIMATION_TOO_LONG',
      maxSeconds:
        PIN_ANIMATION_LIMITS.maxDurationSeconds,
    })
  })

  it('rechaza por tamaño usando el límite general de vídeo (100 MB), no uno propio', () => {
    const result =
      validatePinAnimationUpload(
        VIDEO_LIMITS.maxSizeBytes + 1,
        3,
      )

    expect(result).toEqual({
      code: 'VIDEO_TOO_LARGE',
      maxBytes:
        VIDEO_LIMITS.maxSizeBytes,
    })
  })

  it('el tamaño se comprueba antes que la duración cuando ambos fallan', () => {
    const result =
      validatePinAnimationUpload(
        VIDEO_LIMITS.maxSizeBytes + 1,
        10,
      )

    expect(result?.code).toBe(
      'VIDEO_TOO_LARGE',
    )
  })
})