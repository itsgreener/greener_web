import type { NextRequest } from 'next/server'

import { registerCandidate } from '@/modules/talent/container'

import {
  failureResponse,
  honeypotOf,
  readJsonBody,
  rejectCrossSite,
  talentRequest,
} from '@/app/api/talent/_lib/talentRequest'

/**
 * POST /api/talent/candidates — alta por email. Cuerpo: `{ email, website? }`
 * (`website` es el honeypot). Responde `{ ok: true }` exista o no el email: si
 * existe se le reenvía el enlace y el visitante no lo sabe.
 */
export async function POST(request: NextRequest) {
  const talent = talentRequest(request)
  const blocked = rejectCrossSite(request, talent)

  if (blocked) return blocked

  const parsed = await readJsonBody(request, talent)

  if (!parsed.ok) return parsed.response

  const result = await registerCandidate(
    parsed.body,
    honeypotOf(parsed.body),
    talent.context,
  )

  return result.ok
    ? talent.respond({ ok: true })
    : failureResponse(result, talent)
}
