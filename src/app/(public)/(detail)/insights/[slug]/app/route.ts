import { createPackageDocumentRoute } from '@/app/(public)/(detail)/_lib/packageRoutes'

/**
 * Sirve el HTML real de un insight bajo /insights/[slug]/app.
 *
 * Tools e Insights comparten el mismo contrato técnico. Ver
 * `_lib/packageRoutes.ts`.
 */
export const GET = createPackageDocumentRoute({
  kind: 'insight',
  basePath: '/insights',
  notFoundLabel: 'Insight no encontrado',
})
