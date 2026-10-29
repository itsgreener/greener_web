import { createServiceClient } from '@/lib/supabase/serviceClient'

import {
  PACKAGE_BUCKET,
  PACKAGE_STAGING_PREFIX,
  isStagedPackagePath,
} from '@/modules/packages/domain/packageFiles'
import type {
  StagedUploadFile,
  StagedUploadSweeper,
} from '@/modules/packages/domain/packageUploadPorts'

const PAGE_SIZE = 100
const CONCURRENCY = 10
const FOLDER_NAME = /^[0-9a-f-]{36}$/i

/**
 * Limpieza de la zona de paso con la clave de servicio: la ejecuta una tarea
 * programada, sin sesión de admin detrás, y la política del bucket solo deja
 * listar y borrar a `is_admin()`. Importador autorizado de
 * `createServiceClient` (lo fija `serviceClientImporters.test.ts`).
 *
 * Solo toca rutas con la forma exacta de una subida preparada
 * (`_incoming/<uuid>/<uuid>.zip`): cualquier otra cosa del prefijo se ignora.
 * El borrado va por la API de Storage y no por SQL, que dejaría el fichero
 * físico huérfano.
 */
export const supabaseStagedUploadSweeper: StagedUploadSweeper = {
  async listStaged(maxFolders) {
    const bucket = createServiceClient().storage.from(PACKAGE_BUCKET)

    const folders: string[] = []
    let truncated = false

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await bucket.list(PACKAGE_STAGING_PREFIX, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })

      if (error)
        throw new Error(`No se pudo listar _incoming: ${error.message}`)

      const page = (data ?? []).map((item) => item.name)

      for (const name of page) {
        if (!FOLDER_NAME.test(name)) continue

        if (folders.length >= maxFolders) {
          truncated = true
          break
        }

        folders.push(name)
      }

      if (truncated || page.length < PAGE_SIZE) break
    }

    const files: StagedUploadFile[] = []

    for (let i = 0; i < folders.length; i += CONCURRENCY) {
      const group = folders.slice(i, i + CONCURRENCY)

      const listings = await Promise.all(
        group.map(async (folder) => {
          const { data, error } = await bucket.list(
            `${PACKAGE_STAGING_PREFIX}/${folder}`,
            { limit: PAGE_SIZE },
          )

          if (error) {
            throw new Error(
              `No se pudo listar _incoming/${folder}: ${error.message}`,
            )
          }

          return (data ?? []).flatMap((item) => {
            const path = `${PACKAGE_STAGING_PREFIX}/${folder}/${item.name}`

            if (!isStagedPackagePath(path)) return []

            const created = Date.parse(item.created_at ?? '')

            return [{ path, createdAt: Number.isNaN(created) ? null : created }]
          })
        }),
      )

      files.push(...listings.flat())
    }

    return { files, truncated }
  },

  async remove(paths) {
    const safe = paths.filter(isStagedPackagePath)

    if (safe.length === 0) return 0

    const { data, error } = await createServiceClient()
      .storage.from(PACKAGE_BUCKET)
      .remove(safe)

    if (error)
      throw new Error(`No se pudo borrar de _incoming: ${error.message}`)

    return data?.length ?? 0
  },
}
