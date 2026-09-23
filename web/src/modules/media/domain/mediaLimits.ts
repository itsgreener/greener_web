/**
 * Reglas de negocio de subida de imagen y vídeo.
 *
 * Esta capa no depende de Cloudinary, Supabase ni Next.js.
 */

export const IMAGE_LIMITS = {
  maxSizeBytes: 5 * 1024 * 1024,

  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
  ] as const,

  allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'avif'] as const,

  recommendedFormats: ['webp', 'avif'] as const,
} as const

export const VIDEO_LIMITS = {
  maxSizeBytes: 100 * 1024 * 1024,

  maxDurationSeconds: 180,

  recommendedFormat: 'mp4',

  recommendedCodec: 'h264',
} as const

export const PIN_ANIMATION_LIMITS = {
  maxDurationSeconds: 5,
} as const

export type MediaValidationError =
  | {
      code: 'IMAGE_TOO_LARGE'
      maxBytes: number
    }
  | {
      code: 'IMAGE_FORMAT_NOT_ALLOWED'
    }
  | {
      code: 'GIF_NOT_ALLOWED'
    }
  | {
      code: 'ANIMATED_IMAGE_NOT_ALLOWED'
      format: 'webp' | 'png'
    }
  | {
      code: 'VIDEO_TOO_LARGE'
      maxBytes: number
    }
  | {
      code: 'VIDEO_TOO_LONG'
      maxSeconds: number
    }
  | {
      code: 'ANIMATION_TOO_LONG'
      maxSeconds: number
    }

export interface ImageFileLike {
  size: number
  type: string
  name: string

  arrayBuffer(): Promise<ArrayBuffer>
}

function getExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.')

  if (parts.length < 2) {
    return ''
  }

  return parts.at(-1) ?? ''
}

function asciiAt(bytes: Uint8Array, offset: number, value: string): boolean {
  if (offset + value.length > bytes.length) {
    return false
  }

  for (let index = 0; index < value.length; index += 1) {
    if (bytes[offset + index] !== value.charCodeAt(index)) {
      return false
    }
  }

  return true
}

function containsAscii(bytes: Uint8Array, value: string): boolean {
  for (let index = 0; index <= bytes.length - value.length; index += 1) {
    if (asciiAt(bytes, index, value)) {
      return true
    }
  }

  return false
}

function isGif(bytes: Uint8Array): boolean {
  return asciiAt(bytes, 0, 'GIF87a') || asciiAt(bytes, 0, 'GIF89a')
}

function isWebP(bytes: Uint8Array): boolean {
  return asciiAt(bytes, 0, 'RIFF') && asciiAt(bytes, 8, 'WEBP')
}

function isAnimatedWebP(bytes: Uint8Array): boolean {
  if (!isWebP(bytes)) {
    return false
  }

  if (containsAscii(bytes, 'ANIM')) {
    return true
  }

  /*
   * En VP8X el byte de flags está
   * en el offset 20.
   *
   * El bit 0x02 indica animación.
   */
  if (asciiAt(bytes, 12, 'VP8X') && bytes.length > 20) {
    return (bytes[20] & 0x02) !== 0
  }

  return false
}

function isPng(bytes: Uint8Array): boolean {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

  if (bytes.length < signature.length) {
    return false
  }

  return signature.every((value, index) => bytes[index] === value)
}

function isAnimatedPng(bytes: Uint8Array): boolean {
  return isPng(bytes) && containsAscii(bytes, 'acTL')
}

/**
 * Conservamos esta función para no romper
 * los usos/tests existentes.
 *
 * Solo valida tamaño.
 */
export function validateImageUpload(
  sizeBytes: number,
): MediaValidationError | null {
  if (sizeBytes > IMAGE_LIMITS.maxSizeBytes) {
    return {
      code: 'IMAGE_TOO_LARGE',

      maxBytes: IMAGE_LIMITS.maxSizeBytes,
    }
  }

  return null
}

/**
 * Validación completa de un archivo de imagen
 * antes de enviarlo a Cloudinary.
 *
 * Rechaza:
 * - GIF, aunque esté renombrado
 * - WebP animado
 * - APNG
 * - tipos/extensiones no permitidos
 * - archivos > 5 MB
 */
export async function validateImageFile(
  file: ImageFileLike,
): Promise<MediaValidationError | null> {
  const sizeValidation = validateImageUpload(file.size)

  if (sizeValidation) {
    return sizeValidation
  }

  const mimeType = file.type.trim().toLowerCase()

  const extension = getExtension(file.name)

  if (mimeType === 'image/gif' || extension === 'gif') {
    return {
      code: 'GIF_NOT_ALLOWED',
    }
  }

  const validMime = IMAGE_LIMITS.allowedMimeTypes.includes(
    mimeType as (typeof IMAGE_LIMITS.allowedMimeTypes)[number],
  )

  const validExtension = IMAGE_LIMITS.allowedExtensions.includes(
    extension as (typeof IMAGE_LIMITS.allowedExtensions)[number],
  )

  /*
   * Algunos navegadores pueden entregar
   * type="".
   *
   * En ese caso dejamos que la extensión
   * y posteriormente la firma real decidan.
   */
  if (mimeType !== '' && !validMime) {
    return {
      code: 'IMAGE_FORMAT_NOT_ALLOWED',
    }
  }

  if (extension !== '' && !validExtension) {
    return {
      code: 'IMAGE_FORMAT_NOT_ALLOWED',
    }
  }

  const buffer = await file.arrayBuffer()

  const bytes = new Uint8Array(buffer)

  /*
   * Comprobación por firma binaria.
   *
   * Así un GIF llamado foto.png
   * tampoco pasa.
   */
  if (isGif(bytes)) {
    return {
      code: 'GIF_NOT_ALLOWED',
    }
  }

  if (isAnimatedWebP(bytes)) {
    return {
      code: 'ANIMATED_IMAGE_NOT_ALLOWED',

      format: 'webp',
    }
  }

  if (isAnimatedPng(bytes)) {
    return {
      code: 'ANIMATED_IMAGE_NOT_ALLOWED',

      format: 'png',
    }
  }

  return null
}

export function validateVideoUpload(
  sizeBytes: number,
  durationSeconds: number,
): MediaValidationError | null {
  if (sizeBytes > VIDEO_LIMITS.maxSizeBytes) {
    return {
      code: 'VIDEO_TOO_LARGE',

      maxBytes: VIDEO_LIMITS.maxSizeBytes,
    }
  }

  if (durationSeconds > VIDEO_LIMITS.maxDurationSeconds) {
    return {
      code: 'VIDEO_TOO_LONG',

      maxSeconds: VIDEO_LIMITS.maxDurationSeconds,
    }
  }

  return null
}

export function validatePinAnimationUpload(
  sizeBytes: number,
  durationSeconds: number,
): MediaValidationError | null {
  if (sizeBytes > VIDEO_LIMITS.maxSizeBytes) {
    return {
      code: 'VIDEO_TOO_LARGE',

      maxBytes: VIDEO_LIMITS.maxSizeBytes,
    }
  }

  if (durationSeconds > PIN_ANIMATION_LIMITS.maxDurationSeconds) {
    return {
      code: 'ANIMATION_TOO_LONG',

      maxSeconds: PIN_ANIMATION_LIMITS.maxDurationSeconds,
    }
  }

  return null
}
