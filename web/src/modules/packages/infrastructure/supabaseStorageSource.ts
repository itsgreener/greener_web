import { StorageApiError } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'

import { PACKAGE_CACHE_TAG } from '@/lib/cache/packageCache'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'
import { createServiceClient } from '@/lib/supabase/serviceClient'

import {
  buildAssetEtag,
  isNotModified,
} from '@/modules/packages/domain/assetCaching'
import {
  PackageNotFoundError,
  PackageSourceUnavailableError,
  type PackageManifest,
  type ResolvedPackage,
} from '@/modules/packages/domain/manifest'
import { storedPackageManifestSchema } from '@/modules/packages/domain/manifestSchema'
import { PACKAGE_BUCKET } from '@/modules/packages/domain/packageFiles'
import {
  PACKAGE_KIND_CONTENT_TYPE,
  type PackageKind,
} from '@/modules/packages/domain/packageKind'
import type {
  PackageAsset,
  PublishedPackageSource,
} from '@/modules/packages/domain/publishedPackageSource'

/**
 * Resuelve slug -> paquete publicado leyendo Supabase (arquitectura §5, §9.2,
 * §12.2). La metadata (qué versión es la publicada) sale de UNA consulta con
 * el cliente de lectura pública: RLS ya garantiza que solo se ve la versión
 * publicada de un contenido publicado. Los bytes se descargan con la service
 * role solo porque el bucket es privado (el navegador nunca habla con
 * Storage, §12.1).
 *
 * Un fallo de Supabase/Storage es `PackageSourceUnavailableError` (503), no
 * `PackageNotFoundError` (404): un corte no debe parecer «la tool no existe».
 */

interface PublishedVersion {
  storagePath: string
  manifest: unknown
  checksum: string
}

/** TTL de la caché de versión publicada; el ABM la invalida por etiqueta. */
const PACKAGE_VERSION_TTL_SECONDS = 60

/** Versión publicada del paquete de un contenido publicado, o NotFound. */
async function resolvePublishedVersion(
  kind: PackageKind,
  slug: string,
): Promise<PublishedVersion> {
  const { data, error } = await createPublicReadClient()
    .from('content')
    .select(
      `
      html_package (
        current_version:html_package_version!html_package_current_version_fk (
          storage_path, manifest, checksum, status
        )
      )
    ` as const,
    )
    // El tipo de paquete no siempre se llama como el contenido (variety → other).
    .eq('type', PACKAGE_KIND_CONTENT_TYPE[kind])
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) {
    throw new PackageSourceUnavailableError(slug, { cause: error })
  }

  const pkg = Array.isArray(data?.html_package)
    ? data.html_package[0]
    : data?.html_package
  const version = pkg?.current_version

  if (!version || version.status !== 'published') {
    throw new PackageNotFoundError(slug)
  }

  return {
    storagePath: version.storage_path,
    manifest: version.manifest,
    checksum: version.checksum,
  }
}

// Los fallos (incluido «no existe») no se cachean: unstable_cache solo guarda
// lo que devuelve, y así una URL inventada no ocupa una entrada por slug.
const cachedPublishedVersion = unstable_cache(
  resolvePublishedVersion,
  ['published-package-version'],
  { tags: [PACKAGE_CACHE_TAG], revalidate: PACKAGE_VERSION_TTL_SECONDS },
)

async function downloadFile(slug: string, path: string): Promise<Blob> {
  const { data: file, error } = await createServiceClient()
    .storage.from(PACKAGE_BUCKET)
    .download(path)

  if (error) {
    // Storage responde 404 (a veces con status 400 y statusCode '404') si el
    // objeto no existe; cualquier otra cosa es un fallo del servicio.
    const missing =
      error instanceof StorageApiError &&
      (error.status === 404 || error.statusCode === '404')

    throw missing
      ? new PackageNotFoundError(slug)
      : new PackageSourceUnavailableError(slug, { cause: error })
  }

  if (!file) {
    throw new PackageNotFoundError(slug)
  }

  return file
}

async function getStoragePackage(
  kind: PackageKind,
  slug: string,
): Promise<ResolvedPackage> {
  const version = await cachedPublishedVersion(kind, slug)

  // El manifest se validó al subir el ZIP; releerlo aquí evita fiarse de un
  // `Json` sin forma si alguien toca la fila a mano. Con el schema tolerante:
  // las versiones anteriores al bloque `metadata` siguen sirviéndose.
  const parsedManifest = storedPackageManifestSchema.safeParse(version.manifest)

  if (!parsedManifest.success) {
    throw new PackageNotFoundError(slug)
  }

  const manifest: PackageManifest = parsedManifest.data

  const file = await downloadFile(
    slug,
    `${version.storagePath}/${manifest.entrypoint}`,
  )

  return { slug, manifest, html: await file.text() }
}

/**
 * `ifNoneMatch` es la cabecera de la petición: si coincide con el ETag de
 * la versión publicada se evita la descarga desde Storage y se devuelve
 * `notModified`. Como el checksum es inmutable por versión, una versión
 * nueva o un rollback cambian el ETag y el navegador recibe el asset nuevo.
 */
async function getStoragePackageAsset(
  kind: PackageKind,
  slug: string,
  assetPath: string[],
  ifNoneMatch: string | null = null,
): Promise<PackageAsset> {
  const version = await cachedPublishedVersion(kind, slug)

  // Protección zip-slip: el propio
  // path ya se validó al subir (§12.5), pero un asset pedido con ".." en
  // la URL pública no debe poder salir de la carpeta de esta versión.
  if (assetPath.some((segment) => segment === '..' || segment === '')) {
    throw new PackageNotFoundError(slug)
  }

  const etag = buildAssetEtag(version.checksum)

  if (isNotModified(ifNoneMatch, etag)) {
    return { notModified: true, etag }
  }

  const file = await downloadFile(
    slug,
    `${version.storagePath}/${assetPath.join('/')}`,
  )

  return {
    notModified: false,
    etag,
    data: Buffer.from(await file.arrayBuffer()),
  }
}

export const supabasePublishedPackageSource: PublishedPackageSource = {
  getPackage: getStoragePackage,
  getAsset: getStoragePackageAsset,
}
