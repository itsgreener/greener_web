import { NextRequest, NextResponse } from 'next/server'

import { clientIpFromHeaders } from '@/lib/http/clientIp'
import { createFixedWindowRateLimiter } from '@/lib/rateLimit/inMemoryRateLimiter'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'

const ACTION_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,63}$/i

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Límite por IP (auditoría 8 oct): sin él, cualquiera podía inflar «Tool
 * Used» en bucle (el filtro `sec-fetch-site` no existe fuera de un
 * navegador). Holgado: una tool real dispara pocos eventos por minuto.
 */
const limiter = createFixedWindowRateLimiter({ max: 60, windowMs: 60_000 })

/** Tiempo máximo de la llamada a Plausible: que nunca deje la petición colgada. */
const PLAUSIBLE_TIMEOUT_MS = 5000

interface PackageAnalyticsBody {
  slug?: unknown
  action?: unknown
}

function noContent() {
  return new NextResponse(null, {
    status: 204,
  })
}

/**
 * Recibe eventos de uso efectivo desde una Tool publicada.
 *
 * El navegador solo envía slug + action.
 * El UUID real de content se resuelve aquí para que:
 *
 * - Tool Open y Tool Used utilicen el mismo toolId.
 * - el paquete ZIP no conozca IDs internos.
 * - no podamos fabricar un toolId arbitrario desde el cliente.
 */
export async function POST(request: NextRequest) {
  const fetchSite = request.headers.get('sec-fetch-site')

  if (fetchSite && fetchSite !== 'same-origin') {
    return new NextResponse(null, {
      status: 403,
    })
  }

  const clientIp = clientIpFromHeaders(request.headers)

  if (!limiter.check(clientIp ?? 'unknown')) {
    return new NextResponse(null, { status: 429 })
  }

  let body: PackageAnalyticsBody

  try {
    body = (await request.json()) as PackageAnalyticsBody
  } catch {
    return NextResponse.json(
      {
        error: 'JSON inválido.',
      },
      {
        status: 400,
      },
    )
  }

  if (typeof body.slug !== 'string' || !SLUG_PATTERN.test(body.slug)) {
    return NextResponse.json(
      {
        error: 'slug inválido.',
      },
      {
        status: 400,
      },
    )
  }

  if (
    typeof body.action !== 'string' ||
    !ACTION_PATTERN.test(body.action.trim())
  ) {
    return NextResponse.json(
      {
        error: 'action inválida.',
      },
      {
        status: 400,
      },
    )
  }

  const slug = body.slug
  const action = body.action.trim()

  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim()

  /**
   * Igual que analytics.ts:
   * en desarrollo/local no enviamos
   * nada a Plausible.
   */
  if (process.env.NODE_ENV !== 'production' || !domain) {
    return noContent()
  }

  const client = createPublicReadClient()

  const { data: content, error } = await client
    .from('content')
    .select('id')
    .eq('type', 'tool')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      {
        error: 'No se pudo resolver la Tool.',
      },
      {
        status: 500,
      },
    )
  }

  if (!content) {
    return NextResponse.json(
      {
        error: 'Tool no encontrada.',
      },
      {
        status: 404,
      },
    )
  }

  const userAgent = request.headers.get('user-agent')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': userAgent ?? 'Greener',
  }

  if (clientIp) {
    headers['X-Forwarded-For'] = clientIp
  }

  let plausibleResponse: Response

  try {
    plausibleResponse = await fetch('https://plausible.io/api/event', {
      method: 'POST',
      signal: AbortSignal.timeout(PLAUSIBLE_TIMEOUT_MS),
      headers,
      body: JSON.stringify({
        name: 'Tool Used',

        domain,

        url: `https://${domain}/tools/${slug}/app`,

        props: {
          toolId: content.id,
          action,
        },

        interactive: true,
      }),
    })
  } catch (error) {
    console.error('Plausible no respondió al registrar Tool Used:', error)
    return new NextResponse(null, { status: 502 })
  }

  if (!plausibleResponse.ok) {
    return new NextResponse(null, {
      status: 502,
    })
  }

  return noContent()
}
