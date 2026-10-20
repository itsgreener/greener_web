import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { adminApiGuard, getAdminActor } from '@/lib/auth/adminSession'

import { recordAuditEvent } from '@/modules/audit/container'
import { resolveCvLink } from '@/modules/talent/container'

const querySchema = z.object({
  candidate: z.uuid(),
  file: z.uuid().optional(),
})

const NO_STORE = { 'Cache-Control': 'no-store' }

/**
 * `GET /api/admin/talent/cv?candidate=<uuid>[&file=<uuid>]`: abre el CV de un
 * candidato (o uno de sus ficheros) y **deja constancia de quién lo abre**.
 *
 * Los CVs son datos personales: el ABM no enseña nunca un enlace directo, sino
 * esta ruta, que (1) exige sesión de admin, (2) saca la ruta de la base a
 * partir de los ids —nunca de la petición—, (3) anota la apertura en el
 * registro de actividad y solo entonces (4) redirige: a una URL firmada de
 * 60 s si el CV sigue en el bucket, o al enlace de Drive. Si no se puede
 * anotar, no se abre.
 */
export async function GET(request: NextRequest) {
  const denied = await adminApiGuard()

  if (denied) return denied

  const actor = await getAdminActor()

  if (!actor) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const params = querySchema.safeParse({
    candidate: request.nextUrl.searchParams.get('candidate'),
    file: request.nextUrl.searchParams.get('file') ?? undefined,
  })

  if (!params.success) {
    return NextResponse.json(
      { error: 'Parámetros no válidos' },
      { status: 400, headers: NO_STORE },
    )
  }

  const { candidate, file } = params.data
  const result = await resolveCvLink({
    candidateId: candidate,
    fileId: file ?? null,
  })

  if (!result.ok) {
    return result.reason === 'not_found'
      ? NextResponse.json(
          { error: 'Este candidato no tiene ese fichero.' },
          { status: 404, headers: NO_STORE },
        )
      : NextResponse.json(
          { error: 'No se ha podido preparar el enlace.' },
          { status: 503, headers: NO_STORE },
        )
  }

  const recorded = await recordAuditEvent({
    actorEmail: actor.email,
    action: file ? 'talent.file_open' : 'talent.cv_open',
    entity: 'talent_candidate',
    entityId: candidate,
    payload: file ? { fileId: file, kind: result.kind } : { kind: result.kind },
  })

  if (!recorded) {
    return NextResponse.json(
      { error: 'No se ha podido anotar la apertura; no se abre el fichero.' },
      { status: 503, headers: NO_STORE },
    )
  }

  return NextResponse.redirect(result.url, { status: 302, headers: NO_STORE })
}
