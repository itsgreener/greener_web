import { v2 as cloudinary } from 'cloudinary'

import { env } from '@/lib/env'

import {
  validateImageFile,
  validateVideoUpload,
} from '@/modules/media/domain/mediaLimits'

cloudinary.config({
  cloud_name: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
})

const IMAGE_FOLDER = 'greener/content'
const VIDEO_FOLDER = 'greener/content/videos'

export type SignedMediaUpload = {
  timestamp: number
  signature: string
  folder: string
  apiKey: string
  cloudName: string
}

export type VerifiedCloudinaryImageAsset = {
  cloudinaryPublicId: string
  format: string
  width: number
  height: number
  bytes: number
}

export type VerifiedCloudinaryVideoAsset = {
  cloudinaryPublicId: string
  format: string
  width: number
  height: number
  durationSeconds: number
  bytes: number
}

export class CloudinaryImageVerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CloudinaryImageVerificationError'
  }
}

export class CloudinaryVideoVerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CloudinaryVideoVerificationError'
  }
}

type CloudinaryImageResource = {
  public_id?: unknown
  resource_type?: unknown
  format?: unknown
  width?: unknown
  height?: unknown
  bytes?: unknown
  secure_url?: unknown
}

type CloudinaryVideoResource = {
  public_id?: unknown
  resource_type?: unknown
  format?: unknown
  width?: unknown
  height?: unknown
  duration?: unknown
  bytes?: unknown
}

function createSignedUpload(folder: string): SignedMediaUpload {
  const timestamp = Math.floor(Date.now() / 1000)

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
    },
    env.CLOUDINARY_API_SECRET,
  )

  return {
    timestamp,
    signature,
    folder,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  }
}

export function createSignedImageUpload(): SignedMediaUpload {
  return createSignedUpload(IMAGE_FOLDER)
}

export function createSignedVideoUpload(): SignedMediaUpload {
  return createSignedUpload(VIDEO_FOLDER)
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function imageMimeFromFormat(format: string): string {
  switch (format) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'

    case 'png':
      return 'image/png'

    case 'webp':
      return 'image/webp'

    case 'avif':
      return 'image/avif'

    case 'gif':
      return 'image/gif'

    default:
      return `image/${format}`
  }
}

function validationErrorMessage(
  validation: Awaited<ReturnType<typeof validateImageFile>> | null,
): string | null {
  if (!validation) {
    return null
  }

  switch (validation.code) {
    case 'IMAGE_TOO_LARGE':
      return `La imagen supera el límite de ${
        validation.maxBytes / 1024 / 1024
      } MB.`

    case 'GIF_NOT_ALLOWED':
      return (
        'No se permiten archivos GIF. ' +
        'Si necesitas animación, súbela como vídeo.'
      )

    case 'ANIMATED_IMAGE_NOT_ALLOWED':
      return (
        'No se permiten imágenes animadas. ' +
        'Si necesitas animación, súbela como vídeo.'
      )

    case 'IMAGE_FORMAT_NOT_ALLOWED':
      return (
        'Formato de imagen no permitido. ' + 'Utiliza JPG, PNG, WebP o AVIF.'
      )

    default:
      return 'La imagen subida no es válida.'
  }
}

function videoValidationErrorMessage(
  validation: ReturnType<typeof validateVideoUpload>,
): string | null {
  if (!validation) {
    return null
  }

  switch (validation.code) {
    case 'VIDEO_TOO_LARGE':
      return `El vídeo supera el límite de ${
        validation.maxBytes / 1024 / 1024
      } MB.`

    case 'VIDEO_TOO_LONG':
      return `El vídeo supera el límite de ${validation.maxSeconds} segundos.`

    default:
      return 'El vídeo subido no es válido.'
  }
}

/**
 * Verifica en servidor que un publicId corresponde realmente a una imagen
 * subida al directorio de Greener en Cloudinary.
 *
 * No confía en format/width/height/bytes enviados por el navegador:
 * consulta el asset real mediante la Admin API, descarga el original y
 * reutiliza las reglas binarias de validateImageFile().
 */
export async function verifyCloudinaryImageAsset(
  publicId: string,
): Promise<VerifiedCloudinaryImageAsset> {
  if (
    !publicId.startsWith(`${IMAGE_FOLDER}/`) ||
    publicId.startsWith(`${VIDEO_FOLDER}/`)
  ) {
    throw new CloudinaryImageVerificationError(
      'La imagen no pertenece al directorio permitido de Cloudinary.',
    )
  }

  let rawResource: unknown

  try {
    rawResource = await cloudinary.api.resource(publicId, {
      resource_type: 'image',
      type: 'upload',
    })
  } catch (error) {
    console.error(error)

    throw new CloudinaryImageVerificationError(
      'No se ha podido verificar la imagen en Cloudinary.',
    )
  }

  const resource = rawResource as CloudinaryImageResource

  if (
    typeof resource.public_id !== 'string' ||
    resource.public_id !== publicId ||
    typeof resource.format !== 'string' ||
    !isPositiveInteger(resource.width) ||
    !isPositiveInteger(resource.height) ||
    !isPositiveInteger(resource.bytes) ||
    typeof resource.secure_url !== 'string'
  ) {
    throw new CloudinaryImageVerificationError(
      'Cloudinary ha devuelto datos incompletos para la imagen.',
    )
  }

  if (
    resource.resource_type !== undefined &&
    resource.resource_type !== 'image'
  ) {
    throw new CloudinaryImageVerificationError(
      'El recurso de Cloudinary no es una imagen.',
    )
  }

  const format = resource.format.toLowerCase()

  if (format === 'gif') {
    throw new CloudinaryImageVerificationError(
      'No se permiten archivos GIF. Si necesitas animación, súbela como vídeo.',
    )
  }

  const allowedFormats = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif'])

  if (!allowedFormats.has(format)) {
    throw new CloudinaryImageVerificationError(
      'Formato de imagen no permitido. Utiliza JPG, PNG, WebP o AVIF.',
    )
  }

  let response: Response

  try {
    response = await fetch(resource.secure_url, {
      cache: 'no-store',
    })
  } catch (error) {
    console.error(error)

    throw new CloudinaryImageVerificationError(
      'No se ha podido descargar la imagen original para verificarla.',
    )
  }

  if (!response.ok) {
    throw new CloudinaryImageVerificationError(
      'No se ha podido descargar la imagen original para verificarla.',
    )
  }

  const buffer = await response.arrayBuffer()

  const validation = await validateImageFile({
    name: `cloudinary.${format}`,
    type: imageMimeFromFormat(format),
    size: Math.max(resource.bytes, buffer.byteLength),

    async arrayBuffer() {
      return buffer
    },
  })

  const validationMessage = validationErrorMessage(validation)

  if (validationMessage) {
    throw new CloudinaryImageVerificationError(validationMessage)
  }

  return {
    cloudinaryPublicId: resource.public_id,
    format,
    width: resource.width,
    height: resource.height,
    bytes: resource.bytes,
  }
}

/**
 * Verifica en servidor que un publicId corresponde realmente a un vídeo
 * subido al directorio específico de vídeos de Greener en Cloudinary.
 *
 * No confía en format/width/height/duration/bytes enviados por el
 * navegador. Los metadatos se obtienen directamente de la Admin API de
 * Cloudinary.
 *
 * A diferencia de las imágenes, no se descarga el original completo:
 * un vídeo puede pesar hasta 100 MB y Cloudinary ya ha procesado el asset
 * y expone sus metadatos reales mediante la Admin API.
 */
export async function verifyCloudinaryVideoAsset(
  publicId: string,
): Promise<VerifiedCloudinaryVideoAsset> {
  if (!publicId.startsWith(`${VIDEO_FOLDER}/`)) {
    throw new CloudinaryVideoVerificationError(
      'El vídeo no pertenece al directorio permitido de Cloudinary.',
    )
  }

  let rawResource: unknown

  try {
    rawResource = await cloudinary.api.resource(publicId, {
      resource_type: 'video',
      type: 'upload',
    })
  } catch (error) {
    console.error(error)

    throw new CloudinaryVideoVerificationError(
      'No se ha podido verificar el vídeo en Cloudinary.',
    )
  }

  const resource = rawResource as CloudinaryVideoResource

  if (
    typeof resource.public_id !== 'string' ||
    resource.public_id !== publicId ||
    typeof resource.format !== 'string' ||
    resource.format.trim().length === 0 ||
    !isPositiveInteger(resource.width) ||
    !isPositiveInteger(resource.height) ||
    !isPositiveNumber(resource.duration) ||
    !isPositiveInteger(resource.bytes)
  ) {
    throw new CloudinaryVideoVerificationError(
      'Cloudinary ha devuelto datos incompletos para el vídeo.',
    )
  }

  if (
    resource.resource_type !== undefined &&
    resource.resource_type !== 'video'
  ) {
    throw new CloudinaryVideoVerificationError(
      'El recurso de Cloudinary no es un vídeo.',
    )
  }

  const format = resource.format.toLowerCase()

  const validation = validateVideoUpload(resource.bytes, resource.duration)

  const validationMessage = videoValidationErrorMessage(validation)

  if (validationMessage) {
    throw new CloudinaryVideoVerificationError(validationMessage)
  }

  return {
    cloudinaryPublicId: resource.public_id,
    format,
    width: resource.width,
    height: resource.height,
    durationSeconds: resource.duration,
    bytes: resource.bytes,
  }
}

/**
 * Borra el archivo real en Cloudinary.
 */
export async function deleteCloudinaryAsset(
  publicId: string,
  resourceType: 'image' | 'video',
): Promise<void> {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  })

  if (result?.result !== 'ok' && result?.result !== 'not found') {
    throw new Error(
      `Cloudinary no ha podido borrar el recurso (${
        result?.result ?? 'sin respuesta'
      }).`,
    )
  }
}
