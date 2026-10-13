import type { ResolvedPackage } from './manifest'

export type PackageKind = 'tool' | 'insight'

/**
 * Resultado de pedir un asset: o bien el navegador ya tiene esta versión
 * (`notModified`, sin descargar nada), o bien los bytes. `etag` sale del
 * checksum de la versión publicada (ver assetCaching.ts).
 */
export type PackageAsset =
  | { notModified: true; etag: string }
  | { notModified: false; etag: string; data: Buffer }

/** Lo que sirve la web pública de un paquete publicado. */
export interface PublishedPackageSource {
  /** @throws PackageNotFoundError | PackageSourceUnavailableError */
  getPackage(kind: PackageKind, slug: string): Promise<ResolvedPackage>

  /**
   * Un asset (CSS/JS/etc.) del paquete publicado, por ruta relativa. Con
   * `ifNoneMatch` igual al ETag vigente no se descarga nada.
   *
   * @throws PackageNotFoundError | PackageSourceUnavailableError
   */
  getAsset(
    kind: PackageKind,
    slug: string,
    assetPath: string[],
    ifNoneMatch?: string | null,
  ): Promise<PackageAsset>
}
