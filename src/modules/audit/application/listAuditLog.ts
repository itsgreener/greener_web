import type { AuditLogQuery } from '@/modules/audit/domain/auditLogQuery'
import type { AuditLogRepository } from '@/modules/audit/domain/auditLogRepository'

export function makeListAuditLog({ audit }: { audit: AuditLogRepository }) {
  return async function listAuditLog(query: AuditLogQuery) {
    return audit.list(query)
  }
}
