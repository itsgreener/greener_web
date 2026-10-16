import { NextResponse } from 'next/server'
import { checkDatabase } from '@/modules/health/container'

/**
 * GET /api/health (plan de pendientes, B2): comprobación de vida para el
 * monitor del servidor (y para el cron de Dinahosting si se quiere).
 *
 *   200 { "status": "ok" }     la app responde y llega a Supabase
 *   503 { "status": "error" }  la app responde pero no llega a la base
 *
 * Sin detalles del fallo en la respuesta (un endpoint público no debe dar
 * pistas de la infraestructura) y sin caché en ningún nivel. No requiere
 * sesión: el proxy solo le añade las cabeceras de seguridad globales.
 */
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  const healthy = await checkDatabase()

  return NextResponse.json(
    { status: healthy ? 'ok' : 'error' },
    { status: healthy ? 200 : 503, headers: NO_STORE },
  )
}
