/**
 * Reglas de negocio de subida de imagen y vídeo.
 *
 * Esta capa no depende de Cloudinary, Supabase ni Next.js.
 */

import type { ContentType } from '@/modules/shared/domain/contentType'

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

/**
 * Límite de un vídeo de pin «normal» (casos, insights, episodios, other) y,
 * a la vez, umbral por debajo del cual un vídeo se anima en el feed.
 * Pasó de 5 a 8 s el 5 oct 2026: la mayoría de los vídeos que se cargan
 * duran entre 5 y 7 s. Un vídeo de pin de una tool puede durar más (ver
 * TOOL_PIN_VIDEO_LIMITS), pero por encima de este umbral en el feed solo
 * se enseña su poster — el vídeo completo se descarga solo en el detalle.
 */
export const PIN_ANIMATION_LIMITS = {
  maxDurationSeconds: 8,
} as const

/**
 * Vídeos de demostración de una tool (5 oct 2026): viajan en el flujo de
 * pines existente y sustituyen a la imagen de la ficha `/tools/{slug}?pin=`.
 * Más estrictos en peso que el vídeo genérico (100 MB) porque el plan Free
 * de Cloudinary no admite derroche, y más largos que una animación de pin
 * porque en el detalle se ven enteros.
 */
export const TOOL_PIN_VIDEO_LIMITS = {
  maxDurationSeconds: 15,
  maxSizeBytes: 15 * 1024 * 1024,
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

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  )
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  )
}

function isGif(bytes: Uint8Array): boolean {
  return asciiAt(bytes, 0, 'GIF87a') || asciiAt(bytes, 0, 'GIF89a')
}

function isWebP(bytes: Uint8Array): boolean {
  return asciiAt(bytes, 0, 'RIFF') && asciiAt(bytes, 8, 'WEBP')
}

/*
 * Detección de animación recorriendo los CHUNKS del formato (auditoría
 * 8 oct). Antes se buscaba la cadena `ANIM`/`acTL` en todo el fichero, y
 * esos 4 bytes pueden aparecer por azar dentro de los datos comprimidos de
 * una imagen estática de varios MB: un falso positivo rechazaba una foto
 * válida sin explicación posible para quien la sube.
 */
function isAnimatedWebP(bytes: Uint8Array): boolean {
  if (!isWebP(bytes)) {
    return false
  }

  // VP8X (formato extendido): el bit 0x02 del byte de flags (offset 20)
  // indica animación.
  if (asciiAt(bytes, 12, 'VP8X') && bytes.length > 20) {
    if ((bytes[20] & 0x02) !== 0) return true
  }

  // Chunks RIFF: fourCC (4) + tamaño little-endian (4) + datos, con relleno
  // a tamaño par. ANIM/ANMF solo existen en WebP animados.
  let offset = 12

  while (offset + 8 <= bytes.length) {
    if (asciiAt(bytes, offset, 'ANIM') || asciiAt(bytes, offset, 'ANMF')) {
      return true
    }

    const size = readUint32LE(bytes, offset + 4)
    offset += 8 + size + (size % 2)
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
  if (!isPng(bytes)) {
    return false
  }

  // Chunks PNG: longitud big-endian (4) + tipo (4) + datos + CRC (4). En un
  // APNG, acTL va siempre antes del primer IDAT: al llegar a IDAT sin haberlo
  // visto, la imagen es estática.
  let offset = 8

  while (offset + 8 <= bytes.length) {
    if (asciiAt(bytes, offset + 4, 'acTL')) return true
    if (asciiAt(bytes, offset + 4, 'IDAT')) return false

    offset += 12 + readUint32BE(bytes, offset)
  }

  return false
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

/**
 * Límites de un vídeo de pin según el tipo de contenido del pin: los de una
 * tool son TOOL_PIN_VIDEO_LIMITS, el resto los de siempre (VIDEO_LIMITS en
 * peso, PIN_ANIMATION_LIMITS en duración). La misma regla vive en SQL
 * (`attach_pin_video`), que es la autoritativa; esto es lo que usa el ABM
 * para avisar antes de subir y para redactar los mensajes.
 */
export function pinVideoLimitsFor(contentType: ContentType | string): {
  maxDurationSeconds: number
  maxSizeBytes: number
} {
  if (contentType === 'tool') {
    return {
      maxDurationSeconds: TOOL_PIN_VIDEO_LIMITS.maxDurationSeconds,
      maxSizeBytes: TOOL_PIN_VIDEO_LIMITS.maxSizeBytes,
    }
  }

  return {
    maxDurationSeconds: PIN_ANIMATION_LIMITS.maxDurationSeconds,
    maxSizeBytes: VIDEO_LIMITS.maxSizeBytes,
  }
}

export function validatePinVideoUpload(
  contentType: ContentType | string,
  sizeBytes: number,
  durationSeconds: number,
): MediaValidationError | null {
  const limits = pinVideoLimitsFor(contentType)

  if (sizeBytes > limits.maxSizeBytes) {
    return {
      code: 'VIDEO_TOO_LARGE',

      maxBytes: limits.maxSizeBytes,
    }
  }

  if (durationSeconds > limits.maxDurationSeconds) {
    return {
      code: 'ANIMATION_TOO_LONG',

      maxSeconds: limits.maxDurationSeconds,
    }
  }

  return null
}

/**
 * ¿Un vídeo de pin de esta duración se anima en el feed? Si no se conoce la
 * duración (filas antiguas sin dato) se asume que sí, que es lo que pasaba
 * antes de existir este umbral.
 */
export function canAnimateInFeed(
  durationSeconds: number | null | undefined,
): boolean {
  if (durationSeconds === null || durationSeconds === undefined) return true

  return durationSeconds <= PIN_ANIMATION_LIMITS.maxDurationSeconds
}
