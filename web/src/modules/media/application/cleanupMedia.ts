import {
  deleteCloudinaryAsset,
  isManagedPublicId,
} from '../infrastructure/cloudinaryServer'
import {
  findExistingMediaIds,
  isPublicIdRegistered,
  listContentMediaRefs,
  listPinMediaRefs,
  type MediaKind,
  type MediaRef,
} from '../infrastructure/supabaseMediaRefs'

/**
 * Limpieza de Cloudinary (5 oct 2026): con el plan Free no se puede
 * permitir acumular archivos que ya no usa nadie. Hay tres momentos en los
 * que un archivo puede quedarse sin dueño y este módulo cubre los tres:
 *
 * 1. Se borra un PIN o un CONTENIDO entero → `snapshot…` antes de borrar
 *    en Postgres + `purgeRemovedMedia` después (las funciones SQL
 *    `delete_pin` y `delete_content` ya borran los `media_asset` que
 *    quedan sin referencias; aquí se borra el archivo real).
 * 2. Se sube un archivo desde el navegador y algo falla antes de
 *    registrarlo → `discardUnregisteredUpload`.
 * 3. Cualquier otra cosa (pestaña cerrada a medias, restos históricos) →
 *    `scripts/reconcile-cloudinary.mjs`.
 *
 * Todo es best-effort: un fallo de Cloudinary NUNCA debe impedir ni deshacer
 * la operación de Postgres que ya se hizo; se devuelve el recuento de
 * fallos para poder avisar y el reconciliador recoge lo que quede.
 */

export interface PurgeResult {
  purged: number
  failed: number
}

/** Medios de un pin, leídos ANTES de borrarlo. Nunca lanza: devuelve []. */
export async function snapshotPinMedia(pinId: string): Promise<MediaRef[]> {
  try {
    return await listPinMediaRefs(pinId)
  } catch (error) {
    console.error(error)
    return []
  }
}

/** Medios de un contenido, leídos ANTES de borrarlo. Nunca lanza. */
export async function snapshotContentMedia(
  contentId: string,
): Promise<MediaRef[]> {
  try {
    return await listContentMediaRefs(contentId)
  } catch (error) {
    console.error(error)
    return []
  }
}

/**
 * Tras borrar en Postgres: de los medios que había, los que ya NO existen en
 * `media_asset` (nadie los referencia) se borran de Cloudinary. Los que
 * siguen existiendo se quedan: los usa otro sitio y borrarlos lo rompería.
 */
export async function purgeRemovedMedia(
  refs: MediaRef[],
): Promise<PurgeResult> {
  if (refs.length === 0) return { purged: 0, failed: 0 }

  let stillThere: Set<string>

  try {
    stillThere = await findExistingMediaIds(refs.map((ref) => ref.mediaId))
  } catch (error) {
    // Sin poder comprobarlo NO se borra nada: más vale un archivo de más
    // (lo recogerá el reconciliador) que uno de menos que aún se use.
    console.error(error)
    return { purged: 0, failed: refs.length }
  }

  const gone = refs.filter((ref) => !stillThere.has(ref.mediaId))

  let purged = 0
  let failed = 0

  for (const ref of gone) {
    if (!isManagedPublicId(ref.cloudinaryPublicId)) continue

    try {
      await deleteCloudinaryAsset(ref.cloudinaryPublicId, ref.kind)
      purged += 1
    } catch (error) {
      console.error(error)
      failed += 1
    }
  }

  return { purged, failed }
}

/**
 * Un archivo recién subido a Cloudinary que NO llegó a registrarse en
 * `media_asset` (validación fallida, error del servidor…): se borra. Si el
 * public id sí está registrado, no se toca. Devuelve true si se borró.
 */
export async function discardUnregisteredUpload(
  publicId: string,
  kind: MediaKind,
): Promise<boolean> {
  if (!isManagedPublicId(publicId)) return false

  try {
    if (await isPublicIdRegistered(publicId)) return false

    await deleteCloudinaryAsset(publicId, kind)

    return true
  } catch (error) {
    console.error(error)
    return false
  }
}
