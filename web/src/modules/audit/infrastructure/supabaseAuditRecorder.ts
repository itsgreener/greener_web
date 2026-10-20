import { createClient } from '@/lib/supabase/server'
import { createRepositoryError } from '@/lib/supabase/repositoryError'
import type { Json } from '@/lib/supabase/database.types'

import type { AuditRecorder } from '@/modules/audit/domain/auditRecorder'

/**
 * Inserta en `audit_log` con la sesión del admin: la política
 * `audit_log_admin_insert` solo deja a un admin (RLS), no hace falta clave de
 * servicio.
 */
export const supabaseAuditRecorder: AuditRecorder = {
  async record(event) {
    const supabase = await createClient()

    const { error } = await supabase.from('audit_log').insert({
      actor_email: event.actorEmail,
      action: event.action,
      entity: event.entity,
      entity_id: event.entityId,
      payload: (event.payload ?? null) as Json | null,
    })

    if (error) throw createRepositoryError(error.message, error.code)
  },
}
