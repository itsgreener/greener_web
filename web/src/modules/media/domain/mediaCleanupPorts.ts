import type { MediaKind } from '@/modules/shared/domain/mediaKind'

/** Un archivo del almacén de medios y el `media_asset` que lo registra. */
export interface MediaRef {
  mediaId: string
  cloudinaryPublicId: string
  kind: MediaKind
}

/** Lecturas de «qué archivos cuelgan de qué» para la limpieza de medios. */
export interface MediaRefsRepository {
  listPinMediaRefs(pinId: string): Promise<MediaRef[]>

  listContentMediaRefs(contentId: string): Promise<MediaRef[]>

  listMediaRefsByIds(mediaIds: string[]): Promise<MediaRef[]>

  /** De los ids dados, los que siguen existiendo en `media_asset`. */
  findExistingMediaIds(mediaIds: string[]): Promise<Set<string>>

  isPublicIdRegistered(publicId: string): Promise<boolean>
}

/** El almacén físico de los archivos. */
export interface MediaFileStore {
  /** ¿Es un archivo de la carpeta del ABM? Fuera de ella nunca se borra nada. */
  isManaged(publicId: string): boolean

  delete(publicId: string, kind: MediaKind): Promise<void>
}

export interface PurgeResult {
  purged: number
  failed: number
}

/**
 * Limpieza de archivos que se quedan sin dueño (ver `makeMediaCleanup`).
 * Es lo que reciben los casos de uso que borran pines, contenidos o medios.
 */
export interface MediaCleanup {
  /** Medios de un pin, leídos ANTES de borrarlo. Nunca lanza: devuelve []. */
  snapshotPinMedia(pinId: string): Promise<MediaRef[]>

  /** Medios de un contenido, leídos ANTES de borrarlo. Nunca lanza. */
  snapshotContentMedia(contentId: string): Promise<MediaRef[]>

  /** Medios concretos, leídos de la base de datos ANTES de desvincularlos. Nunca lanza. */
  snapshotMedia(mediaIds: string[]): Promise<MediaRef[]>

  /** Tras borrar en la base de datos, borra los archivos que ya no usa nadie. */
  purgeRemovedMedia(refs: MediaRef[]): Promise<PurgeResult>

  /** Descarta un archivo recién subido que no llegó a registrarse. */
  discardUnregisteredUpload(publicId: string, kind: MediaKind): Promise<boolean>
}
