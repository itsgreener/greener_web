import { createPackageAssetRoute } from '@/app/(public)/(detail)/_lib/packageRoutes'

/**
 * Sirve los assets (CSS, JS, el Worker) de una página satélite bajo su propia ruta, mismo
 * origen (arquitectura §12.1). Ver `_lib/packageRoutes.ts`.
 */
export const GET = createPackageAssetRoute('variety')
