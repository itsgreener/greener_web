import 'server-only'

import { makeListAuditLog } from './application/listAuditLog'
import { makeRecordAuditEvent } from './application/recordAuditEvent'
import { supabaseAuditLogRepository } from './infrastructure/supabaseAuditLogRepository'
import { supabaseAuditRecorder } from './infrastructure/supabaseAuditRecorder'

/**
 * Composition root del registro de actividad. La lectura es de solo lectura;
 * `recordAuditEvent` solo añade filas (RLS no permite editar ni borrar).
 */
export const listAuditLog = makeListAuditLog({
  audit: supabaseAuditLogRepository,
})

export const recordAuditEvent = makeRecordAuditEvent({
  recorder: supabaseAuditRecorder,
})
