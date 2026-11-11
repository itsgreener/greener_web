import { createRepositoryError } from '@/lib/supabase/repositoryError'
import type { createClient } from '@/lib/supabase/server'

import { PACKAGE_BUCKET } from '@/modules/packages/domain/packageFiles'

export type StorageClient = Awaited<ReturnType<typeof createClient>>['storage']

const LIST_PAGE_SIZE = 100

/**
 * Lista TODOS los ficheros bajo un prefijo del bucket. `list` de Storage no
 * es recursivo: las subcarpetas (p. ej. `assets/`) vuelven como entradas sin
 * `id`, y hay que entrar en ellas.
 */
export async function listFilesRecursive(
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
