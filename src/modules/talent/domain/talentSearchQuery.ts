import { pageCount, parsePage } from '@/modules/shared/domain/pagination'
import {
  CANDIDATE_STATUS_FILTER_VALUES,
  PROFILE_VALUES,
  TALENT_ADMIN_PAGE_SIZE,
} from './talentConstants'

const MAX_QUERY_LENGTH = 100

export interface CandidateSearchQuery {
  /** Texto a buscar en nombre y email. Ya saneado. */
  q: string
  /** Un estado de `CANDIDATE_STATUS_FILTER_VALUES`; vacío = todos. */
  status: string
  /** Uno de `PROFILE_VALUES`; vacío = cualquiera. */
  profile: string
  /** Empieza en 1. */
  page: number
  pageSize: number
}

/**
 * Convierte los parámetros de la URL en una consulta válida. Lo que no cuadra
 * (un estado inventado, una página negativa) se ignora en vez de romper la
 * pantalla. El texto pierde los caracteres con significado en un `ilike` o en
 * la sintaxis `or()` de PostgREST (`% _ * , ( ) " \`): un email con `_` se
 * busca igualmente por el resto.
 */
export function parseCandidateSearchQuery(params: {
  q?: string
  status?: string
  profile?: string
  page?: string
}): CandidateSearchQuery {
  const status = (params.status ?? '').trim()
  const profile = (params.profile ?? '').trim()

  return {
    q: (params.q ?? '')
      .replace(/[%_*,()"\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_QUERY_LENGTH),
    status: (CANDIDATE_STATUS_FILTER_VALUES as readonly string[]).includes(
      status,
    )
      ? status
      : '',
    profile: (PROFILE_VALUES as readonly string[]).includes(profile)
      ? profile
      : '',
    page: parsePage(params.page),
    pageSize: TALENT_ADMIN_PAGE_SIZE,
  }
}

export function candidatePageCount(total: number, pageSize: number): number {
  return pageCount(total, pageSize)
}
