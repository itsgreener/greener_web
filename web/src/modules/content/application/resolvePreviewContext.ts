import type { AppSupabaseClient } from '@/lib/supabase/database'

import { createServiceClient } from '@/lib/supabase/serviceClient'

import { decodePreviewToken } from '../infrastructure/previewToken'

import { getContentBySlug } from './getContentBySlug'

import type { Locale } from '@/modules/shared/domain/locale'
export interface PreviewResolution {
  content: Awaited<ReturnType<typeof getContentBySlug>>
  client: AppSupabaseClient | undefined
  isPreview: boolean
}

/**
 * Punto único de entrada para las plantillas de detalle públicas
 * (/work, /tools, /insights, /variety): decide si la petición trae un
 * token de preview válido (arquitectura §15.3) para ESTE slug, y si es
 * así devuelve el contenido ya leído con privilegios
 * (createServiceClient(), salta RLS) junto con ese mismo cliente — las
 * páginas lo reutilizan en sus fetches secundarios (carrusel, episodio)
 * en vez de volver a pasar por RLS pública, que los bloquearía igual.
 *
 * Sin token, o con uno inválido/caducado/ajeno a este slug, se cae al
 * camino público normal (sin cliente, `getContentBySlug` usa
 * `createPublicReadClient()` por defecto) — el mismo resultado que si
 * esta función no existiera.
 */
export async function resolvePreviewContext(
  slug: string,
  previewToken: string | undefined,
  locale?: Locale,
): Promise<PreviewResolution> {
  if (previewToken) {
    const contentId = decodePreviewToken(previewToken)

    if (contentId) {
      const serviceClient = createServiceClient()
      const content = await getContentBySlug(slug, locale, serviceClient)

      // El token demuestra conocer el secreto del servidor para ESE
      // contentId — si no coincide con lo que hay en este slug (p.ej.
      // el slug cambió después de generar el link), no se sirve nada
      // con privilegios.
      if (content && content.id === contentId) {
        return { content, client: serviceClient, isPreview: true }
      }
    }
  }

  const content = await getContentBySlug(slug, locale)
  return { content, client: undefined, isPreview: false }
}
