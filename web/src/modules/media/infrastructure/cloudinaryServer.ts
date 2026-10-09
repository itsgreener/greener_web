import 'server-only'

import { v2 as cloudinary } from 'cloudinary'

import { getCloudinaryEnv } from '@/lib/serverEnv'

import {
  IMAGE_FORMAT_NOT_ALLOWED_MESSAGE,
  imageValidationMessage,
} from '@/modules/media/domain/imageValidationMessage'
import {
  IMAGE_LIMITS,
  validateImageFile,
  validateVideoUpload,
} from '@/modules/media/domain/mediaLimits'

let configured = false

/**
 * El SDK se configura la primera vez que se usa, no al importar el módulo:
 * así una variable de Cloudinary que falte solo rompe lo que habla con
 * Cloudinary (ver serverEnv.ts), no cualquier página que importe este fichero.
 */
function sdk() {
  if (!configured) {
    const env = getCloudinaryEnv()

    cloudinary.config({
      cloud_name: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    })
    configured = true
  }

  return cloudinary
}

const IMAGE_FOLDER = 'greener/content'
const VIDEO_FOLDER = 'greener/content/videos'

/**
 * ¿Es este public id de un archivo subido por el ABM de Greener
 * (`greener/content/**`, incluidos los vídeos)? Cualquier borrado
 * automático en Cloudinary pasa antes por aquí: nunca se toca nada fuera
 * de esa carpeta, aunque el navegador mande otro identificador.
 */
export function isManagedPublicId(publicId: string): boolean {
  return publicId.startsWith(`${IMAGE_FOLDER}/`)
}

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
  /** Duración REAL en segundos (puede traer decimales; el esquema la redondea hacia arriba). */
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
  const env = getCloudinaryEnv()
  const timestamp = Math.floor(Date.now() / 1000)

  const signature = sdk().utils.api_sign_request(
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
    rawResource = await sdk().api.resource(publicId, {
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
    resource.format.trim().length === 0 ||
    !isPositiveInteger(resource.width) ||
    !isPositiveInteger(resource.height) ||
    !isPositiveInteger(resource.bytes) ||
    typeof resource.secure_url !== 'string' ||
    resource.secure_url.length === 0
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

  if (!(IMAGE_LIMITS.allowedExtensions as readonly string[]).includes(format)) {
    throw new CloudinaryImageVerificationError(IMAGE_FORMAT_NOT_ALLOWED_MESSAGE)
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

  const validationMessage = imageValidationMessage(
    validation,
    'La imagen subida no es válida.',
  )

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
 * DURACIÓN (8 oct 2026). La Admin API solo devuelve `duration` si se pide
 * `image_metadata: true` (comprobado contra Cloudinary real: sin él no
 * viene; con él, 130,73 en un vídeo de 130 s). Si aun así faltara, se usa
 * `reportedDurationSeconds`, la duración que Cloudinary entregó al navegador
 * en la respuesta de la propia subida (real, aunque no verificada por el
 * servidor). NUNCA se inventa una: hasta el 8 oct un `?? 10` guardaba 10 s
 * en los vídeos sin duración (27 filas de `media_asset` con 10,0 exactos),
 * lo que falseaba el límite de 180 s y el coste del calentamiento. Si no
 * hay ninguna de las dos, se rechaza el vídeo.
 *
 * A diferencia de las imágenes, no se descarga el original completo:
 * un vídeo puede pesar hasta 100 MB y Cloudinary ya ha procesado el asset
 * y expone sus metadatos reales mediante la Admin API.
 */
export async function verifyCloudinaryVideoAsset(
  publicId: string,
  reportedDurationSeconds?: number,
): Promise<VerifiedCloudinaryVideoAsset> {
  if (!publicId.startsWith(`${VIDEO_FOLDER}/`)) {
    throw new CloudinaryVideoVerificationError(
      'El vídeo no pertenece al directorio permitido de Cloudinary.',
    )
  }

  let rawResource: unknown

  try {
    rawResource = await sdk().api.resource(publicId, {
      resource_type: 'video',
      type: 'upload',
      // Sin `image_metadata` la Admin API no devuelve `duration`
      // (confirmado el 8 oct 2026 contra Cloudinary real).
      image_metadata: true,
    })
  } catch (error) {
    console.error(error)

    throw new CloudinaryVideoVerificationError(
      'No se ha podido verificar el vídeo en Cloudinary.',
    )
  }

  const resource = rawResource as CloudinaryVideoResource

  let duration: number

  if (isPositiveNumber(resource.duration)) {
    duration = resource.duration
  } else if (isPositiveNumber(reportedDurationSeconds)) {
    console.warn(
      `verifyCloudinaryVideoAsset: la Admin API no devolvió duration para ${publicId}; se usa la que Cloudinary dio al navegador (${reportedDurationSeconds} s).`,
    )
    duration = reportedDurationSeconds
  } else {
    throw new CloudinaryVideoVerificationError(
      'Cloudinary no ha devuelto la duración del vídeo.',
    )
  }

  if (
    typeof resource.public_id !== 'string' ||
    resource.public_id !== publicId ||
    typeof resource.format !== 'string' ||
    resource.format.trim().length === 0 ||
    !isPositiveInteger(resource.width) ||
    !isPositiveInteger(resource.height) ||
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

  const validation = validateVideoUpload(resource.bytes, duration)

  const validationMessage = videoValidationErrorMessage(validation)

  if (validationMessage) {
    throw new CloudinaryVideoVerificationError(validationMessage)
  }

  return {
    cloudinaryPublicId: resource.public_id,
    format,
    width: resource.width,
    height: resource.height,
    durationSeconds: duration,
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
  // Defensa en profundidad: nunca se borra nada fuera de la carpeta del
  // ABM, aunque quien llama se haya saltado su propia comprobación.
  if (!isManagedPublicId(publicId)) {
    throw new Error(
      'Borrado rechazado: el archivo no pertenece a la carpeta del ABM.',
    )
  }

  const result = await sdk().uploader.destroy(publicId, {
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

/**
 * Calentamiento de un vídeo (fase 2 del contrato de medios): pide a
 * Cloudinary, de forma ASÍNCRONA, las versiones indicadas (cadenas de
 * transformación del contrato, las mismas que construyen las URL de
 * entrega), para que el primer visitante no espere a que se generen al
 * vuelo.
 *
 * Devuelve en cuanto Cloudinary acepta el encargo; NO espera a que termine
 * (comprobado el 8 oct 2026: tarda hasta ~70 s para 2 rendiciones de un vídeo
 * de 130 s). Repetir la llamada con las mismas cadenas NO se reutiliza:
 * Cloudinary vuelve a generar y a cobrar, así que quien llama debe saltarse
 * los vídeos ya calentados (`media_asset.warmed_contract`).
 *
 * Solo vídeos de la carpeta de vídeos de Greener y solo con cadenas dadas
 * (nunca construye transformaciones por su cuenta).
 */
export async function warmVideoRenditions(
  publicId: string,
  transformations: string[],
): Promise<void> {
  if (!publicId.startsWith(`${VIDEO_FOLDER}/`)) {
    throw new Error('El vídeo no pertenece al directorio permitido.')
  }

  if (transformations.length === 0) {
    throw new Error('No hay versiones que calentar.')
  }

  await sdk().uploader.explicit(publicId, {
    type: 'upload',
    resource_type: 'video',
    eager: transformations,
    eager_async: true,
  })
}
