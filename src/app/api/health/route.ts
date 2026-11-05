import { NextResponse, type NextRequest } from 'next/server'

import { clientIpFromHeaders } from '@/lib/http/clientIp'
import { createSharedRateLimiter } from '@/lib/rateLimit/sharedRateLimiter'
import { checkDatabase } from '@/modules/health/container'
import { HEALTH_RATE_LIMIT } from '@/modules/health/domain/healthLimits'

/**
 * GET /api/health (plan de pendientes, B2): comprobación de vida para el
 * monitor del servidor (y para el cron de Dinahosting si se quiere).
 *
 *   200 { "status": "ok" }     la app responde y llega a Supabase
 *   503 { "status": "error" }  la app responde pero no llega a la base
 *   429 { "status": "rate_limited" }  demasiadas llamadas desde esa IP
 *
 * Sin detalles del fallo en la respuesta (un endpoint público no debe dar
 * pistas de la infraestructura) y sin caché en ningún nivel. No requiere
 * sesión: el proxy solo le añade las cabeceras de seguridad globales.
 *
 * Límite por IP (SEC-PUB-A4): cada llamada hace una lectura a la base y la
 * ruta es anónima, así que sin tope cualquiera podía usarla para cargar la
 * base. 30 por minuto y IP deja de sobra a un monitor (uno o dos por minuto,
 * aunque varias sondas compartan IP). Si no se puede leer la IP no se limita:
 * todos caerían en la misma llave y el monitor recibiría 429 por culpa de
 * otros. El límite se comprueba ANTES de tocar la base.
 */
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

const limiter = createSharedRateLimiter({
  name: 'health',
  ...HEALTH_RATE_LIMIT,
})

export async function GET(request: NextRequest) {
  const clientIp = clientIpFromHeaders(request.headers)

  if (clientIp && !(await limiter.check(clientIp))) {
    return NextResponse.json(
      { status: 'rate_limited' },
      {
        status: 429,
        headers: { ...NO_STORE, 'Retry-After': '60' },
      },
    )
  }

  const healthy = await checkDatabase()

  return NextResponse.json(
    { status: healthy ? 'ok' : 'error' },
    { status: healthy ? 200 : 503, headers: NO_STORE },
  )
}
