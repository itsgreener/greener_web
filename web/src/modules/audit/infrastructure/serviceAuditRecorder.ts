import { createServiceClient } from '@/lib/supabase/serviceClient'
import { createRepositoryError } from '@/lib/supabase/repositoryError'
import type { Json } from '@/lib/supabase/database.types'

import type { AuditRecorder } from '@/modules/audit/domain/auditRecorder'

/**
 * Igual que `supabaseAuditRecorder`, pero con la clave de servicio: para hechos
 * que ocurren SIN sesión de admin (la purga por plazo que lanza n8n, que no
 * tiene un admin detrás). Salta RLS: solo se usa desde rutas que ya han
 * comprobado su propia credencial. Sigue siendo solo anexar.
 */
export const serviceAuditRecorder: AuditRecorder = {
  async record(event) {
    const { error } = await createServiceClient()
      .from('audit_log')
      .insert({
        actor_email: event.actorEmail,
        action: event.action,
        entity: event.entity,
        entity_id: event.entityId,
        payload: (event.payload ?? null) as Json | null,
      })

    if (error) throw createRepositoryError(error.message, error.code)
  },
}
