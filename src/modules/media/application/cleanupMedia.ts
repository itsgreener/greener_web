import type {
  MediaCleanup,
  MediaFileStore,
  MediaRef,
  MediaRefsRepository,
  PurgeResult,
} from '@/modules/media/domain/mediaCleanupPorts'

/**
 * Limpieza de Cloudinary: con el plan Free no se pueden acumular archivos
 * que ya no usa nadie. Hay tres momentos en los que un archivo puede
 * quedarse sin dueño y este módulo cubre los tres:
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

export function makeMediaCleanup({
  refs,
  files,
}: {
  refs: MediaRefsRepository
  files: MediaFileStore
}): MediaCleanup {
  /** Una lectura que nunca lanza: ante un fallo, [] y al log. */
  async function readRefs(
    read: () => Promise<MediaRef[]>,
  ): Promise<MediaRef[]> {
    try {
      return await read()
    } catch (error) {
      console.error(error)
      return []
    }
  }

  return {
    snapshotPinMedia: (pinId) => readRefs(() => refs.listPinMediaRefs(pinId)),

    snapshotContentMedia: (contentId) =>
      readRefs(() => refs.listContentMediaRefs(contentId)),

    /**
     * Es la única fuente válida del public id que se va a borrar en
     * Cloudinary: nunca el que manda el navegador (auditoría 8 oct, P0-2),
     * que podría apuntar a cualquier archivo de la cuenta.
     */
    snapshotMedia: (mediaIds) =>
      readRefs(() => refs.listMediaRefsByIds(mediaIds)),

    /**
     * Tras borrar en Postgres: de los medios que había, los que ya NO existen
     * en `media_asset` (nadie los referencia) se borran de Cloudinary. Los
     * que siguen existiendo se quedan: los usa otro sitio y borrarlos lo
     * rompería.
     */
    async purgeRemovedMedia(removed): Promise<PurgeResult> {
      if (removed.length === 0) return { purged: 0, failed: 0 }

      let stillThere: Set<string>

      try {
        stillThere = await refs.findExistingMediaIds(
          removed.map((ref) => ref.mediaId),
        )
      } catch (error) {
        // Sin poder comprobarlo NO se borra nada: más vale un archivo de más
        // (lo recogerá el reconciliador) que uno de menos que aún se use.
        console.error(error)
        return { purged: 0, failed: removed.length }
      }

      const gone = removed.filter((ref) => !stillThere.has(ref.mediaId))

      let purged = 0
      let failed = 0

      for (const ref of gone) {
        if (!files.isManaged(ref.cloudinaryPublicId)) continue

        try {
          await files.delete(ref.cloudinaryPublicId, ref.kind)
          purged += 1
        } catch (error) {
          console.error(error)
          failed += 1
        }
      }

      return { purged, failed }
    },

    /**
     * Un archivo recién subido a Cloudinary que NO llegó a registrarse en
     * `media_asset` (validación fallida, error del servidor…): se borra. Si
     * el public id sí está registrado, no se toca. Devuelve true si se borró.
     */
    async discardUnregisteredUpload(publicId, kind) {
      if (!files.isManaged(publicId)) return false

      try {
        if (await refs.isPublicIdRegistered(publicId)) return false

        await files.delete(publicId, kind)

        return true
      } catch (error) {
        console.error(error)
        return false
      }
    },
  }
}
