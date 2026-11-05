import { createPackageDocumentRoute } from '@/app/(public)/(detail)/_lib/packageRoutes'

/**
 * Sirve el HTML real de una página satélite (`other` de tipo page) bajo
 * /variety/[slug]/app (plan de `other`, fase 4).
 *
 * Tools, Insights y páginas satélite comparten el mismo contrato técnico y la
 * misma CSP aislada (`default-src 'self'; connect-src 'self'`): una página
 * satélite debe ser autocontenida. Ver `_lib/packageRoutes.ts`.
 */
export const GET = createPackageDocumentRoute({
  kind: 'variety',
  basePath: '/variety',
  notFoundLabel: 'Página no encontrada',
})
