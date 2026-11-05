/** Tope de `GET /api/health` por IP (SEC-PUB-A4): 30 llamadas por minuto. */
export const HEALTH_RATE_LIMIT = { max: 30, windowMs: 60_000 } as const
