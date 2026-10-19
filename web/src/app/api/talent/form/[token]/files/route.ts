import type { NextRequest } from 'next/server'

import {
  deleteCandidateFile,
  uploadCandidateFile,
} from '@/modules/talent/container'
import { TALENT_FILE_LIMITS } from '@/modules/talent/domain/talentConstants'
import { isUuid } from '@/lib/validation/uuid'

import {
  failureResponse,
  rejectCrossSite,
  talentRequest,
} from '@/app/api/talent/_lib/talentRequest'

type RouteContext = { params: Promise<{ token: string }> }

/** Margen para la cabecera multipart sobre el tope del fichero. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024

/**
 * POST /api/talent/form/[token]/files — un fichero por petición, campo
 * `file` de un `multipart/form-data`. Responde `{ file: { id, extension } }`.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const talent = talentRequest(request)
  const blocked = rejectCrossSite(request, talent)

  if (blocked) return blocked

  const declared = Number(request.headers.get('content-length') ?? 0)

  if (declared > TALENT_FILE_LIMITS.maxFileBytes + MULTIPART_OVERHEAD_BYTES) {
    return talent.respond({ error: 'file_too_large' }, { status: 413 })
  }

  let file: FormDataEntryValue | null

  try {
    file = (await request.formData()).get('file')
  } catch {
    return talent.respond({ error: 'invalid_form_data' }, { status: 400 })
  }

  if (!(file instanceof File)) {
    return talent.respond({ error: 'invalid_form_data' }, { status: 400 })
  }

  const { token } = await params
  const result = await uploadCandidateFile(
    token,
    { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) },
    talent.context,
  )

  return result.ok
    ? talent.respond({ file: result.file }, { status: 201 })
    : failureResponse(result, talent)
}

/** DELETE /api/talent/form/[token]/files?fileId=<uuid> — quita un fichero sin procesar. */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const talent = talentRequest(request)
  const blocked = rejectCrossSite(request, talent)

  if (blocked) return blocked

  const fileId = request.nextUrl.searchParams.get('fileId')

  if (!isUuid(fileId)) {
    return talent.respond({ error: 'not_found' }, { status: 404 })
  }

  const { token } = await params
  const result = await deleteCandidateFile(token, fileId, talent.context)

  return result.ok
    ? talent.respond({ ok: true })
    : failureResponse(result, talent)
}
