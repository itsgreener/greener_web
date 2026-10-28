import { randomUUID } from 'node:crypto'

import { createRepositoryError } from '@/lib/supabase/repositoryError'
import { createClient } from '@/lib/supabase/server'

import {
  PACKAGE_BUCKET,
  stagedPackagePath,
} from '@/modules/packages/domain/packageFiles'
import type { PackageUploadStaging } from '@/modules/packages/domain/packageUploadPorts'

/**
 * Zona de paso en el bucket de paquetes. Va con la sesión del admin (no con la
 * clave de servicio): la política del bucket solo deja escribir y leer a
 * `is_admin()`, y la URL firmada que se entrega al navegador solo sirve para
 * subir esa ruta concreta.
 */
export const supabasePackageUploadStaging: PackageUploadStaging = {
  async createUploadTarget(contentId) {
    const supabase = await createClient()
    const path = stagedPackagePath(contentId, randomUUID())

    const { data, error } = await supabase.storage
      .from(PACKAGE_BUCKET)
      .createSignedUploadUrl(path)

    if (error || !data) {
      throw createRepositoryError(
        `No se pudo preparar la subida: ${error?.message ?? 'sin respuesta'}`,
      )
    }

    return { bucket: PACKAGE_BUCKET, path, token: data.token }
  },

  async read(path) {
    const supabase = await createClient()

    const { data, error } = await supabase.storage
      .from(PACKAGE_BUCKET)
      .download(path)

    if (error || !data) {
      throw createRepositoryError(
        `No se pudo leer la subida: ${error?.message ?? 'sin respuesta'}`,
      )
    }

    return Buffer.from(await data.arrayBuffer())
  },

  async discard(path) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.storage
        .from(PACKAGE_BUCKET)
        .remove([path])

      if (error) console.error('Paquetes · borrado de la subida:', error)
    } catch (error) {
      console.error('Paquetes · borrado de la subida:', error)
    }
  },
}
