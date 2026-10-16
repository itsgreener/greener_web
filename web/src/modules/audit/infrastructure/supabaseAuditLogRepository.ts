import { createClient } from '@/lib/supabase/server'
import { createRepositoryError } from '@/lib/supabase/repositoryError'

import type {
  AuditLogEntry,
  AuditLogRepository,
} from '@/modules/audit/domain/auditLogRepository'

type AuditRow = {
  id: string
  actor_email: string
  action: string
  entity: string
  entity_id: string | null
  payload: AuditLogEntry['payload']
  created_at: string
}

function mapRow(row: AuditRow): AuditLogEntry {
  return {
    id: row.id,
    actorEmail: row.actor_email,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    payload: row.payload,
    createdAt: row.created_at,
  }
}

/**
 * Lee `audit_log` con la sesión del admin: la política `audit_log_admin_read`
 * solo deja leer a un admin (RLS), no hace falta clave de servicio.
 */
export const supabaseAuditLogRepository: AuditLogRepository = {
  async list(query) {
    const supabase = await createClient()

    let request = supabase
      .from('audit_log')
      .select(
        'id, actor_email, action, entity, entity_id, payload, created_at',
        {
          count: 'exact',
        },
      )
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range((query.page - 1) * query.pageSize, query.page * query.pageSize - 1)

    if (query.entity) request = request.eq('entity', query.entity)

    if (query.entityId) request = request.eq('entity_id', query.entityId)

    if (query.q) {
      const pattern = `%${query.q}%`

      request = request.or(
        `actor_email.ilike.${pattern},action.ilike.${pattern}`,
      )
    }

    const { data, error, count } = await request

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return {
      items: ((data ?? []) as AuditRow[]).map(mapRow),
      total: count ?? 0,
    }
  },
}
