import { discardUploadedMediaAction } from './discardUploadActions'

/** Archivo que este formulario acaba de subir a Cloudinary. */
export type UploadedAssetRef = {
  publicId: string
  kind: 'image' | 'video'
}

/**
 * Si el flujo de subida falla DESPUÉS de haber subido el archivo a
 * Cloudinary, lo descarta (el servidor comprueba que no esté registrado).
 * Nunca lanza: es limpieza, no debe tapar el error real que ve el admin.
 */
export async function discardUploadQuietly(
  asset: UploadedAssetRef | null,
): Promise<void> {
  if (!asset) return

  try {
    await discardUploadedMediaAction({
      cloudinaryPublicId: asset.publicId,
      kind: asset.kind,
    })
  } catch (error) {
    console.error(error)
  }
}
