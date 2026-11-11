import { createRepositoryError } from '@/lib/supabase/repositoryError'
import { createClient } from '@/lib/supabase/server'

import type {
  HtmlPackageVersionReader,
  PackageVersionFile,
} from '@/modules/packages/domain/packageDownload'
import { PACKAGE_BUCKET } from '@/modules/packages/domain/packageFiles'

import { listFilesRecursive } from './storageListing'

/** Descargas a la vez: un paquete puede tener cientos de ficheros pequeños. */
const DOWNLOAD_CONCURRENCY = 8

/**
 * Lee de Storage los ficheros de una versión guardada, para reconstruir su ZIP.
 *
 * Va con la sesión del admin, como el resto del ABM de paquetes: la política
 * del bucket solo deja leer a `is_admin()`. Primero comprueba en la base de
 * datos que la versión es de ESE contenido (los identificadores vienen del
 * navegador) y de ahí saca la ruta de Storage, nunca de la petición.
 */
export const supabaseHtmlPackageVersionReader: HtmlPackageVersionReader = {
  async read(contentId, versionId) {
    const supabase = await createClient()

    const { data: version, error: versionError } = await supabase
      .from('html_package_version')
      .select('version, storage_path')
      .eq('id', versionId)
      .eq('package_id', contentId)
      .maybeSingle()

    if (versionError) {
      throw createRepositoryError(versionError.message, versionError.code)
    }

    if (!version) return null

    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('slug')
      .eq('id', contentId)
      .maybeSingle()

    if (contentError) {
      throw createRepositoryError(contentError.message, contentError.code)
    }

    if (!content) return null

    const prefix = `${version.storage_path}/`
    const storagePaths = await listFilesRecursive(
      supabase.storage,
      version.storage_path,
    )

    const files: PackageVersionFile[] = []

    for (
      let from = 0;
      from < storagePaths.length;
      from += DOWNLOAD_CONCURRENCY
    ) {
      const batch = storagePaths.slice(from, from + DOWNLOAD_CONCURRENCY)

      files.push(
        ...(await Promise.all(
          batch.map(async (storagePath) => {
            const { data, error } = await supabase.storage
              .from(PACKAGE_BUCKET)
              .download(storagePath)

            // Un fichero que no se puede leer corta todo: un ZIP al que le
            // falta un asset parecería bueno y fallaría al volver a subirlo.
            if (error || !data) {
              throw createRepositoryError(
                `Fallo leyendo "${storagePath}" de Storage: ${error?.message ?? 'sin respuesta'}`,
              )
            }

            return {
              path: storagePath.slice(prefix.length),
              data: Buffer.from(await data.arrayBuffer()),
            }
          }),
        )),
      )
    }

    return { slug: content.slug, version: version.version, files }
  },
}
