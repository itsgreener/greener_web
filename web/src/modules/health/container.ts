import 'server-only'

import { isDatabaseHealthy } from './infrastructure/databaseHealth'

/** Composition root de la comprobación de vida (`GET /api/health`). */
export const checkDatabase = isDatabaseHealthy
