import { z } from 'zod'
import { pageCount, parsePage } from '@/modules/shared/domain/pagination'

/** Filas por página del visor del registro de actividad. */
export const AUDIT_LOG_PAGE_SIZE = 50

const MAX_QUERY_LENGTH = 100

export interface AuditLogQuery {
  /** Texto a buscar en el email de quien actuó y en la acción. Ya saneado. */
  q: string
  /** Entidad exacta (`content`, `pin`, `media_asset`…); vacío = todas. */
  entity: string
  /** Un contenido, pin… concreto (uuid); vacío = cualquiera. */
  entityId: string
  /** Empieza en 1. */
  page: number
  pageSize: number
}

const uuidSchema = z.uuid()

/**
 * Convierte los parámetros de la URL en una consulta válida. Lo que no
 * cuadra (una entidad con símbolos, un id que no es uuid, una página
 * negativa) se ignora en vez de romper el visor. El texto pierde los
 * caracteres con significado en un `ilike` o en la sintaxis `or()` de
 * PostgREST (`% _ * , ( ) " \\`); la entidad solo admite `a-z` y `_`.
 */
export function parseAuditLogQuery(params: {
  q?: string
  entity?: string
  entityId?: string
  page?: string
}): AuditLogQuery {
  const entityId = uuidSchema.safeParse(params.entityId?.trim())
  const entity = (params.entity ?? '').trim().toLowerCase()

  return {
    q: (params.q ?? '')
      .replace(/[%_*,()"\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_QUERY_LENGTH),
    entity: /^[a-z_]{1,50}$/.test(entity) ? entity : '',
    entityId: entityId.success ? entityId.data : '',
    page: parsePage(params.page),
    pageSize: AUDIT_LOG_PAGE_SIZE,
  }
}

export function auditLogPageCount(total: number, pageSize: number): number {
  return pageCount(total, pageSize)
}
