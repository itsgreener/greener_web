import { createClient } from '@/lib/supabase/server'

import type {
  DeleteHtmlPackageVersionInput,
  DeleteHtmlPackageVersionResult,
  HtmlPackageRepository,
  HtmlPackageVersionSummary,
  PublishHtmlPackageVersionInput,
  UploadHtmlPackageVersionInput,
} from '../domain/htmlPackageRepository'
import { createRepositoryError } from '@/lib/supabase/repositoryError'
import { contentTypeFor, PACKAGE_BUCKET } from '../domain/packageFiles'

type StorageClient = Awaited<ReturnType<typeof createClient>>['storage']

const LIST_PAGE_SIZE = 100

/**
 * Lista TODOS los ficheros bajo un prefijo del bucket. `list` de Storage no
 * es recursivo: las subcarpetas (p. ej. `assets/`) vuelven como entradas sin
 * `id`, y hay que entrar en ellas.
 */
async function listFilesRecursive(
  storage: StorageClient,
  prefix: string,
): Promise<string[]> {
  const files: string[] = []

  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const { data, error } = await storage.from(PACKAGE_BUCKET).list(prefix, {
      limit: LIST_PAGE_SIZE,
      offset,
    })

    if (error) {
      throw createRepositoryError(error.message)
    }

    const entries = data ?? []

    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`

      if (entry.id) {
        files.push(path)
      } else {
        files.push(...(await listFilesRecursive(storage, path)))
      }
    }

    if (entries.length < LIST_PAGE_SIZE) break
  }

  return files
}

/** Limpieza best-effort tras una subida fallida: nunca tapa el error real. */
async function removeUploadedFiles(
  storage: StorageClient,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return

  try {
    const { error } = await storage.from(PACKAGE_BUCKET).remove(paths)
    if (error) console.error(error)
  } catch (error) {
    console.error(error)
  }
}

export const supabaseHtmlPackageRepository: HtmlPackageRepository = {
  async uploadVersion(input: UploadHtmlPackageVersionInput) {
    const supabase = await createClient()

    const { data: existing, error: maxVersionError } = await supabase
      .from('html_package_version')
      .select('version')
      .eq('package_id', input.contentId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (maxVersionError) {
      throw createRepositoryError(maxVersionError.message, maxVersionError.code)
    }

    const version = (existing?.version ?? 0) + 1
    const basePath = `${input.contentId}/v${version}`

    // Dos subidas simultáneas calcularían la misma versión: lo impiden
    // `upsert: false` en Storage y el unique(package_id, version) en
    // Postgres. Lo que faltaba (auditoría 8 oct, P0-10) es no dejar ficheros
    // huérfanos en Storage si algo falla a mitad: se borran los que ESTA
    // subida llegó a escribir (nunca los de otra).
    const uploadedPaths: string[] = []

    try {
      for (const entry of input.entries) {
        const path = `${basePath}/${entry.path}`

        const { error: uploadError } = await supabase.storage
          .from(PACKAGE_BUCKET)
          .upload(path, entry.data, {
            contentType: contentTypeFor(entry.path),
            upsert: false,
          })

        if (uploadError) {
          throw createRepositoryError(
            `Fallo subiendo "${entry.path}" a Storage: ${uploadError.message}`,
          )
        }

        uploadedPaths.push(path)
      }

      const { data, error } = await supabase.rpc(
        'create_html_package_version',
        {
          p_content_id: input.contentId,
          p_version: version,
          p_storage_path: basePath,
          p_checksum: input.checksum,
          p_manifest: input.manifest,
        },
      )

      if (error) {
        throw createRepositoryError(error.message, error.code)
      }

      return data
    } catch (error) {
      await removeUploadedFiles(supabase.storage, uploadedPaths)
      throw error
    }
  },

  async publishVersion(input: PublishHtmlPackageVersionInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('publish_html_package_version', {
      p_content_id: input.contentId,
      p_version_id: input.versionId,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data
  },

  async deleteVersion(
    input: DeleteHtmlPackageVersionInput,
  ): Promise<DeleteHtmlPackageVersionResult> {
    const supabase = await createClient()

    // Primero la base de datos: valida que la versión es de este paquete y
    // que NO es la activa, y devuelve su ruta en Storage.
    const { data, error } = await supabase.rpc('delete_html_package_version', {
      p_content_id: input.contentId,
      p_version_id: input.versionId,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    const storagePath = data

    // Después los ficheros, best-effort: la fila ya no existe, así que un
    // fallo aquí solo deja ficheros huérfanos, no una versión rota.
    let storageFailed = 0

    try {
      const files = await listFilesRecursive(supabase.storage, storagePath)

      if (files.length > 0) {
        const { error: removeError } = await supabase.storage
          .from(PACKAGE_BUCKET)
          .remove(files)

        if (removeError) {
          console.error(removeError)
          storageFailed = files.length
        }
      }
    } catch (storageError) {
      console.error(storageError)
      storageFailed = Math.max(storageFailed, 1)
    }

    return { storagePath, storageFailed }
  },

  async listVersions(contentId: string): Promise<HtmlPackageVersionSummary[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('html_package_version')
      .select('id, version, status, created_at, storage_path')
      .eq('package_id', contentId)
      .order('version', { ascending: false })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      version: row.version,
      status: row.status,
      createdAt: row.created_at,
      storagePath: row.storage_path,
    }))
  },
}
