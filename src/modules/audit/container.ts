import 'server-only'

import { makeListAuditLog } from './application/listAuditLog'
import { makeRecordAuditEvent } from './application/recordAuditEvent'
import { supabaseAuditLogRepository } from './infrastructure/supabaseAuditLogRepository'
import { serviceAuditRecorder } from './infrastructure/serviceAuditRecorder'
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

/** Sin sesión de admin (purga por plazo): con la clave de servicio. */
export const recordSystemAuditEvent = makeRecordAuditEvent({
  recorder: serviceAuditRecorder,
})
