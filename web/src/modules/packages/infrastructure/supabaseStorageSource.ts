import { createPublicReadClient } from '@/lib/supabase/publicReadClient'
import { createServiceClient } from '@/lib/supabase/serviceClient'

import { buildAssetEtag, isNotModified } from '../domain/assetCaching'
import {
  PackageNotFoundError,
  type PackageManifest,
  type ResolvedPackage,
} from '../domain/manifest'

const BUCKET = 'html-packages'

/**
 * Resuelve slug -> ResolvedPackage leyendo Supabase en vez de fixtures/
 * (arquitectura §5, §9.2, §12.2). La metadata (qué versión es la
 * publicada) se consulta con el cliente de lectura pública normal — las
 * políticas de RLS (html_package_public_read, html_package_version_public_read)
 * ya garantizan que solo se ve la versión publicada de contenido
 * publicado; no hace falta reimplementar ese filtro aquí. Los bytes del
 * entrypoint se descargan con la service role SOLO porque el bucket es
 * privado (el navegador nunca habla con Storage directamente, §12.1) —
 * para cuando llega aquí, la comprobación de "está publicado" ya la hizo
 * la query anterior respetando RLS.
 */
export async function getStoragePackage(
  kind: 'tool' | 'insight',
  slug: string,
): Promise<ResolvedPackage> {
  const publicClient = createPublicReadClient()

  const { data: content } = await publicClient
    .from('content')
    .select('id')
    .eq('type', kind)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!content) {
    throw new PackageNotFoundError(slug)
  }

  const { data: pkg } = await publicClient
    .from('html_package')
    .select('current_version_id')
    .eq('content_id', content.id)
    .maybeSingle()

  if (!pkg?.current_version_id) {
    throw new PackageNotFoundError(slug)
  }

  const { data: version } = await publicClient
    .from('html_package_version')
    .select('storage_path, manifest, status')
    .eq('id', pkg.current_version_id)
    .eq('status', 'published')
    .maybeSingle()

  if (!version) {
    throw new PackageNotFoundError(slug)
  }

  const manifest = version.manifest as PackageManifest

  const serviceClient = createServiceClient()

  const { data: file, error: downloadError } = await serviceClient.storage
    .from(BUCKET)
    .download(`${version.storage_path}/${manifest.entrypoint}`)

  if (downloadError || !file) {
    throw new PackageNotFoundError(slug)
  }

  const html = await file.text()

  return { slug, manifest, html }
}

/**
 * Resultado de pedir un asset: o bien el navegador ya tiene esta versión
 * (`notModified`, sin descargar nada de Storage), o bien los bytes.
 * `etag` sale del checksum de la versión publicada (ver assetCaching.ts).
 */
export type StoragePackageAsset =
  | { notModified: true; etag: string }
  | { notModified: false; etag: string; data: Buffer }

/**
 * Resuelve un asset (CSS/JS/etc.) del paquete publicado, por ruta relativa.
 *
 * `ifNoneMatch` es la cabecera de la petición: si coincide con el ETag de
 * la versión publicada se evita la descarga desde Storage y se devuelve
 * `notModified`. Como el checksum es inmutable por versión, una versión
 * nueva o un rollback cambian el ETag y el navegador recibe el asset nuevo.
 */
export async function getStoragePackageAsset(
  kind: 'tool' | 'insight',
  slug: string,
  assetPath: string[],
  ifNoneMatch: string | null = null,
): Promise<StoragePackageAsset> {
  const publicClient = createPublicReadClient()

  const { data: content } = await publicClient
    .from('content')
    .select('id')
    .eq('type', kind)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!content) {
    throw new PackageNotFoundError(slug)
  }

  const { data: pkg } = await publicClient
    .from('html_package')
    .select('current_version_id')
    .eq('content_id', content.id)
    .maybeSingle()

  if (!pkg?.current_version_id) {
    throw new PackageNotFoundError(slug)
  }

  const { data: version } = await publicClient
    .from('html_package_version')
    .select('storage_path, status, checksum')
    .eq('id', pkg.current_version_id)
    .eq('status', 'published')
    .maybeSingle()

  if (!version) {
    throw new PackageNotFoundError(slug)
  }

  // Protección zip-slip equivalente a la de localPackageSource: el propio
  // path ya se validó al subir (§12.5), pero un asset pedido con ".." en
  // la URL pública no debe poder salir de la carpeta de esta versión.
  if (assetPath.some((segment) => segment === '..' || segment === '')) {
    throw new PackageNotFoundError(slug)
  }

  const etag = buildAssetEtag(version.checksum)

  if (isNotModified(ifNoneMatch, etag)) {
    return { notModified: true, etag }
  }

  const serviceClient = createServiceClient()

  const path = `${version.storage_path}/${assetPath.join('/')}`

  const { data: file, error: downloadError } = await serviceClient.storage
    .from(BUCKET)
    .download(path)

  if (downloadError || !file) {
    throw new PackageNotFoundError(slug)
  }

  return {
    notModified: false,
    etag,
    data: Buffer.from(await file.arrayBuffer()),
  }
}
