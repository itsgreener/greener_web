import type { AuditLogQuery } from '@/modules/audit/domain/auditLogQuery'

/** JSON tal como lo guarda la base (`audit_log.payload`). */
export type AuditPayload =
  | string
  | number
  | boolean
  | null
  | AuditPayload[]
  | { [key: string]: AuditPayload | undefined }

export type AuditLogEntry = {
  id: string
  /** Quién actuó (email del admin, o `system:pg_cron` en los jobs). */
  actorEmail: string
  action: string
  entity: string
  entityId: string | null
  payload: AuditPayload | null
  createdAt: string
}

export type AuditLogPage = {
  items: AuditLogEntry[]
  total: number
}

/**
 * Registro de actividad del ABM: SOLO LECTURA. La escritura la hacen las
 * funciones SQL de cada acción (`audit_log` no tiene política de update ni
 * de delete), así que aquí no hay forma de modificarlo.
 */
export interface AuditLogRepository {
  list(query: AuditLogQuery): Promise<AuditLogPage>
}
