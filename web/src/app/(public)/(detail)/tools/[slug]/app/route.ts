import { createPackageDocumentRoute } from '@/app/(public)/(detail)/_lib/packageRoutes'

/**
 * Sirve el HTML real de una tool bajo /tools/[slug]/app.
 *
 * El contenido vive en el mismo origen y no utiliza iframe. Ver
 * `_lib/packageRoutes.ts`.
 */
export const GET = createPackageDocumentRoute({
  kind: 'tool',
  basePath: '/tools',
  notFoundLabel: 'Tool no encontrada',
})
