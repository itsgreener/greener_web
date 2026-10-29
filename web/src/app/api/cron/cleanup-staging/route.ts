import { NextResponse, type NextRequest } from 'next/server'

import { sweepStagedUploads } from '@/modules/packages/container'

import { checkCronAuth } from '@/app/api/cron/_lib/cronAuth'

/**
 * GET /api/cron/cleanup-staging — limpieza semanal de las subidas de ZIP que
 * quedaron sin confirmar en `_incoming/` del bucket de paquetes (ver
 * `sweepStagedUploads.ts`). La lanza Vercel Cron (`vercel.json`, los domingos
 * a las 04:00 UTC) con `Authorization: Bearer <CRON_SECRET>`; cualquier otro
 * planificador puede llamarla igual.
 *
 *   200 { ok, scanned, deleted, failed, truncated }
 *   401 sin credencial o incorrecta · 503 `not_configured` sin CRON_SECRET
 *
 * Repetirla es seguro: solo borra lo que lleva más de 24 horas.
 */
export const dynamic = 'force-dynamic'

/** Segundos máximos de la función (listar y borrar es secuencial por lotes). */
export const maxDuration = 60

function respond(payload: unknown, init: ResponseInit = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...init.headers },
  })
}

export async function GET(request: NextRequest) {
  const auth = checkCronAuth(request)

  if (auth === 'not_configured') {
    return respond({ error: 'not_configured' }, { status: 503 })
  }

  if (auth === 'unauthorized') {
    return respond(
      { error: 'unauthorized' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } },
    )
  }

  try {
    const result = await sweepStagedUploads()

    console.info('Paquetes · limpieza de _incoming:', result)

    return respond({ ok: true, ...result })
  } catch (error) {
    console.error('Paquetes · fallo en la limpieza de _incoming', error)

    return respond({ error: 'unavailable' }, { status: 503 })
  }
}
