import { v2 as cloudinary } from 'cloudinary'

import { env } from '@/lib/env'

// Necesario para uploader.destroy(): a diferencia de la firma de subida
// (api_sign_request recibe el secret directamente como parámetro), destroy
// hace una llamada HTTP autenticada real contra la API de Cloudinary y
// necesita el SDK configurado globalmente.
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

/**
 * Borra el archivo real en Cloudinary. Solo se llama después de que el
 * registro en Postgres ya se ha desvinculado y borrado con éxito
 * (unlink_and_delete_media_asset) — así, si esta llamada falla, no queda
 * ningún media_asset apuntando a un archivo que ya no existe.
 *
 * Lanza si Cloudinary devuelve un error de verdad (red, credenciales...).
 * Si el archivo ya no existiera (result "not found"), no se considera un
 * fallo: el objetivo — que no quede nada huérfano — ya está cumplido.
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
      `Cloudinary no ha podido borrar el recurso (${result?.result ?? 'sin respuesta'}).`,
    )
  }
}
