'use client'

import { useCallback, useState } from 'react'

import {
  getSignedImageUpload,
  getSignedVideoUpload,
  uploadImageToCloudinary,
  uploadVideoToCloudinary,
  type CloudinaryImageResult,
  type CloudinaryVideoResult,
  type SignedMediaUpload,
} from '@/modules/media/client/cloudinaryUpload'

import { discardUploadQuietly, type UploadedAssetRef } from './discardUpload'

/**
 * Flujo de subida directa a Cloudinary del ABM: firmar → subir → (comprobar
 * el resultado real) → registrar en la base de datos. Si algo falla DESPUÉS
 * de haber subido el archivo, se descarta de Cloudinary para no dejar basura
 * (el servidor comprueba que no esté registrado antes de borrar nada).
 *
 * Lo usan la portada, el carrusel de un caso, los pines sueltos y la carga
 * masiva: lo único que cambia entre ellos es qué se comprueba y qué se
 * registra, que es lo que describe `UploadFlow`.
 */

export type RegisterResult = { ok: true } | { ok: false; error: string }

export interface UploadFlow<Uploaded> {
  /** Comprobaciones previas a la subida. Lanza para abortar con ese mensaje. */
  beforeUpload?: () => void | Promise<void>
  /**
   * Con el resultado real de Cloudinary, antes de registrar. Lanza para
   * abortar con ese mensaje; devuelve `false` para abortar sin error (el
   * llamador ya ha avisado al admin). En ambos casos se descarta el archivo.
   */
  afterUpload?: (uploaded: Uploaded) => void | boolean | Promise<void | boolean>
  /** Guarda el medio en la base de datos. */
  register: (uploaded: Uploaded) => Promise<RegisterResult>
}

async function runUpload<Uploaded extends { public_id: string }>(
  kind: UploadedAssetRef['kind'],
  file: File,
  flow: UploadFlow<Uploaded>,
  sign: () => Promise<SignedMediaUpload>,
  upload: (file: File, signed: SignedMediaUpload) => Promise<Uploaded>,
): Promise<Uploaded | null> {
  let asset: UploadedAssetRef | null = null

  try {
    await flow.beforeUpload?.()

    const uploaded = await upload(file, await sign())

    asset = { publicId: uploaded.public_id, kind }

    if ((await flow.afterUpload?.(uploaded)) === false) {
      await discardUploadQuietly(asset)

      return null
    }

    const result = await flow.register(uploaded)

    if (!result.ok) throw new Error(result.error)

    return uploaded
  } catch (error) {
    await discardUploadQuietly(asset)

    throw error
  }
}

/** Sube una imagen. Lanza si falla; `null` si `afterUpload` abortó sin error. */
export function uploadImageFlow(
  file: File,
  flow: UploadFlow<CloudinaryImageResult>,
) {
  return runUpload(
    'image',
    file,
    flow,
    getSignedImageUpload,
    uploadImageToCloudinary,
  )
}

/** Sube un vídeo. Lanza si falla; `null` si `afterUpload` abortó sin error. */
export function uploadVideoFlow(
  file: File,
  flow: UploadFlow<CloudinaryVideoResult>,
) {
  return runUpload(
    'video',
    file,
    flow,
    getSignedVideoUpload,
    uploadVideoToCloudinary,
  )
}

/**
 * Estado de un formulario de subida (subiendo / error / aviso) alrededor de
 * `uploadImageFlow` y `uploadVideoFlow`. Devuelven el resultado de
 * Cloudinary si todo fue bien y `null` si no (el error ya está en `error`).
 */
export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const run = useCallback(
    async <Uploaded>(
      job: () => Promise<Uploaded | null>,
      fallbackError: string,
    ): Promise<Uploaded | null> => {
      setUploading(true)
      setError(null)
      setWarning(null)

      try {
        return await job()
      } catch (uploadError) {
        setError(
          uploadError instanceof Error ? uploadError.message : fallbackError,
        )

        return null
      } finally {
        setUploading(false)
      }
    },
    [],
  )

  const uploadImage = useCallback(
    (file: File, flow: UploadFlow<CloudinaryImageResult>) =>
      run(
        () => uploadImageFlow(file, flow),
        'No se ha podido subir la imagen.',
      ),
    [run],
  )

  const uploadVideo = useCallback(
    (file: File, flow: UploadFlow<CloudinaryVideoResult>) =>
      run(() => uploadVideoFlow(file, flow), 'No se ha podido subir el vídeo.'),
    [run],
  )

  return {
    uploading,
    error,
    warning,
    setError,
    setWarning,
    uploadImage,
    uploadVideo,
  }
}
