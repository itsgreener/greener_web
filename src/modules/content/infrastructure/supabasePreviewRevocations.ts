import type { AppSupabaseClient } from '@/lib/supabase/database'
import { createClient } from '@/lib/supabase/server'
import { createRepositoryError } from '@/lib/supabase/repositoryError'

import type {
  PreviewRevocationReader,
  PreviewRevoker,
} from '@/modules/content/domain/previewRevocations'

/**
 * Lector de la revocación. Recibe el cliente privilegiado desde el container
 * (como `createSupabasePublicContentReader`): este fichero no importa el
 * cliente de servicio.
 */
export function createSupabasePreviewRevocationReader(
  client: AppSupabaseClient,
): PreviewRevocationReader {
  return {
    async revokedAt(contentId) {
      const { data, error } = await client
        .from('content')
        .select('preview_revoked_at')
        .eq('id', contentId)
        .maybeSingle()

      if (error) {
        throw createRepositoryError(error.message, error.code)
      }

      return data?.preview_revoked_at
        ? new Date(data.preview_revoked_at).getTime()
        : null
    },
  }
}

const CONTENT_NOT_FOUND = 'P0002'

export const supabasePreviewRevoker: PreviewRevoker = {
  async revoke(contentId, revokedAt) {
    const supabase = await createClient()

    const { error } = await supabase.rpc('revoke_content_preview_links', {
      p_content_id: contentId,
      p_revoked_at: new Date(revokedAt).toISOString(),
    })

    if (error?.code === CONTENT_NOT_FOUND) return false

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return true
  },
}
