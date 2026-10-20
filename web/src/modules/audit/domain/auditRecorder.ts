import type { AuditPayload } from '@/modules/audit/domain/auditLogRepository'

export type AuditEvent = {
  /** Email del admin que actúa. */
  actorEmail: string
  /** Verbo con prefijo de área: `talent.cv_open`, `talent.cv_upload`… */
  action: string
  entity: string
  entityId: string | null
  payload?: AuditPayload
}

/**
 * Escritura del registro de actividad desde código de aplicación. Las
 * acciones que ya escribe la base (funciones SQL de contenidos) no pasan por
 * aquí; esto es para lo que ocurre fuera de ella, como el ABM de Talent, cuyos
 * datos viven en otro proyecto de Supabase y no pueden llevar un disparador
 * que escriba en `audit_log`.
 *
 * `audit_log` solo admite inserciones (la política de RLS no deja editar ni
 * borrar), así que esto mantiene el carácter de solo anexar.
 */
export interface AuditRecorder {
  record(event: AuditEvent): Promise<void>
}
