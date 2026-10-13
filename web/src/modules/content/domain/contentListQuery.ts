import {
  contentStatusSchema,
  type ContentStatus,
} from '@/modules/shared/domain/contentStatus'
import {
  contentTypeSchema,
  type ContentType,
} from '@/modules/shared/domain/contentType'

/** Filas por página de la lista del ABM. */
export const CONTENT_PAGE_SIZE = 25

const MAX_QUERY_LENGTH = 100

export interface ContentListQuery {
  /** Texto a buscar en slug y título. Ya saneado (ver `parseContentListQuery`). */
  q: string
  type?: ContentType
  status?: ContentStatus
  /** Empieza en 1. */
  page: number
  pageSize: number
}

/**
 * Convierte los parámetros de la URL en una consulta válida. Lo que no
 * cuadra (un tipo inventado, una página negativa) se ignora en vez de
 * romper la lista. El texto pierde los caracteres que tienen significado
 * en un `ilike` o en la sintaxis `or()` de PostgREST (`% _ * , ( ) " \\`).
 */
export function parseContentListQuery(params: {
  q?: string
  type?: string
  status?: string
  page?: string
}): ContentListQuery {
  const type = contentTypeSchema.safeParse(params.type)
  const status = contentStatusSchema.safeParse(params.status)
  const page = Number.parseInt(params.page ?? '', 10)

  return {
    q: (params.q ?? '')
      .replace(/[%_*,()"\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_QUERY_LENGTH),
    type: type.success ? type.data : undefined,
    status: status.success ? status.data : undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: CONTENT_PAGE_SIZE,
  }
}

export function contentPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}
