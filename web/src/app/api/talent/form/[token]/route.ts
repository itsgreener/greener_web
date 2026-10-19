import type { NextRequest } from 'next/server'

import { getCandidateForm, saveCandidateForm } from '@/modules/talent/container'

import {
  failureResponse,
  honeypotOf,
  readJsonBody,
  rejectCrossSite,
  talentRequest,
} from '@/app/api/talent/_lib/talentRequest'

type RouteContext = { params: Promise<{ token: string }> }

/** GET /api/talent/form/[token] — los datos que necesita el formulario. */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const talent = talentRequest(request)
  const blocked = rejectCrossSite(request, talent)

  if (blocked) return blocked

  const { token } = await params
  const result = await getCandidateForm(token, talent.context)

  return result.ok
    ? talent.respond({ form: result.form })
    : failureResponse(result, talent)
}

/** PUT /api/talent/form/[token] — guarda el formulario completo. */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const talent = talentRequest(request)
  const blocked = rejectCrossSite(request, talent)

  if (blocked) return blocked

  const parsed = await readJsonBody(request, talent)

  if (!parsed.ok) return parsed.response

  const { token } = await params
  const result = await saveCandidateForm(
    token,
    parsed.body,
    honeypotOf(parsed.body),
    talent.context,
  )

  return result.ok
    ? talent.respond({ ok: true })
    : failureResponse(result, talent)
}
