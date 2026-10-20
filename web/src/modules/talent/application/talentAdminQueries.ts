import type { TalentAdminRepository } from '@/modules/talent/domain/talentPorts'

/**
 * Lecturas del ABM de Talent: listado con filtros, ficha y resumen por estado.
 * Sin lógica propia más allá de pasar por el puerto; existen para que las
 * páginas no importen la infraestructura.
 */
export function makeTalentAdminQueries({
  admin,
}: {
  admin: TalentAdminRepository
}) {
  return {
    search: admin.search,
    detail: admin.findDetail,
    statusCounts: admin.countByStatus,
  }
}
