import 'server-only'

import { makeListAuditLog } from './application/listAuditLog'
import { supabaseAuditLogRepository } from './infrastructure/supabaseAuditLogRepository'

/** Composition root del registro de actividad (solo lectura). */
export const listAuditLog = makeListAuditLog({
  audit: supabaseAuditLogRepository,
})
