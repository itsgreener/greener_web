import { NextRequest, NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { clientIpFromHeaders } from '@/lib/http/clientIp'
import { createSharedRateLimiter } from '@/lib/rateLimit/sharedRateLimiter'
import { publicContent } from '@/modules/content/container'

const ACTION_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,63}$/i

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Límite por IP: sin él, cualquiera podía inflar «Tool
 * Used» en bucle (el filtro `sec-fetch-site` no existe fuera de un
 * navegador). Holgado: una tool real dispara pocos eventos por minuto.
 */
const limiter = createSharedRateLimiter({
  name: 'analytics-package',
  max: 60,
  windowMs: 60_000,
})

/** Tiempo máximo de la llamada a Plausible: que nunca deje la petición colgada. */
const PLAUSIBLE_TIMEOUT_MS = 5000

interface PackageAnalyticsBody {
  slug?: unknown
  kind?: unknown
  action?: unknown
}

function noContent() {
  return new NextResponse(null, {
    status: 204,
  })
}

/**
 * Recibe eventos de analítica desde el documento de un paquete publicado
 * (`public/greener-package-analytics.js`):
 *
 * - `kind: 'tool'` + `action` → «Tool Used» (uso efectivo de la Tool).
 * - `kind: 'insight'` → «Insight Open» (carga del documento del Insight, que
 *   no tiene ficha React desde la que registrarla en el cliente).
 *
 * El navegador solo envía slug (+ action en una Tool).
 * El UUID real de content se resuelve aquí para que:
 *
 * - Tool Open y Tool Used utilicen el mismo toolId.
 * - el paquete ZIP no conozca IDs internos.
 * - no podamos fabricar un id arbitrario desde el cliente.
 *
 * Sin `kind` se asume `tool` (formato original del cuerpo).
 */
export async function POST(request: NextRequest) {
  const fetchSite = request.headers.get('sec-fetch-site')

  if (fetchSite && fetchSite !== 'same-origin') {
    return new NextResponse(null, {
      status: 403,
    })
  }

  const clientIp = clientIpFromHeaders(request.headers)

  if (!(await limiter.check(clientIp ?? 'unknown'))) {
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

  const kind = body.kind ?? 'tool'

  if (kind !== 'tool' && kind !== 'insight') {
    return NextResponse.json({ error: 'kind inválido.' }, { status: 400 })
  }

  if (
    kind === 'tool' &&
    (typeof body.action !== 'string' ||
      !ACTION_PATTERN.test(body.action.trim()))
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
  const action = typeof body.action === 'string' ? body.action.trim() : ''

  const domain = env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim()

  /**
   * Igual que analytics.ts:
   * en desarrollo/local no enviamos
   * nada a Plausible.
   */
  if (process.env.NODE_ENV !== 'production' || !domain) {
    return noContent()
  }

  let contentId: string | null

  try {
    contentId = await publicContent.publishedContentId(kind, slug)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error: 'No se pudo resolver el contenido.',
      },
      {
        status: 500,
      },
    )
  }

  if (!contentId) {
    return NextResponse.json(
      {
        error: 'Contenido no encontrado.',
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
        name: kind === 'insight' ? 'Insight Open' : 'Tool Used',

        domain,

        url: `https://${domain}/${kind === 'insight' ? 'insights' : 'tools'}/${slug}/app`,

        props:
          kind === 'insight'
            ? { insightId: contentId }
            : { toolId: contentId, action },

        interactive: true,
      }),
    })
  } catch (error) {
    console.error('Plausible no respondió al registrar el evento:', error)
    return new NextResponse(null, { status: 502 })
  }

  if (!plausibleResponse.ok) {
    return new NextResponse(null, {
      status: 502,
    })
  }

  return noContent()
}
