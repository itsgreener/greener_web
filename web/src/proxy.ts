import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import {
  ADMIN_OPENER_POLICY,
  ADMIN_RESOURCE_POLICY,
  buildSecurityHeaders,
} from '@/lib/securityHeaders'
import { env } from '@/lib/env'
import { classifyBotTrap, logBotTrap } from '@/lib/botTraps'
import { isAdminRoute } from '@/lib/adminRoute'

// especificacion-final-formato-detalle.md / contrato-zip-tools-insights.md
// §12.4: estas rutas llevan su propia CSP, pensada para el contrato del
// ZIP. Dos cabeceras Content-Security-Policy en la misma respuesta no se
// sustituyen, se combinan — nunca deben tocarse aquí, ni con el nonce ni
// con el resto de cabeceras globales.
const SANDBOXED_APP_PATTERN = /^\/(tools|insights|variety)\/[^/]+\/app(\/.*)?$/

/**
 * Cabeceras de seguridad globales (arquitectura §17.1) + verificación de
 * dominio del ABM (§15.2). El porqué de cada directiva (nonce +
 * 'strict-dynamic' para script-src) está en `src/lib/securityHeaders.ts`.
 */
export async function proxy(request: NextRequest) {
  const pathname = new URL(request.url).pathname

  // Trampas y sondas de escáneres (lib/botTraps.ts): se registran y se
  // responde 404 sin renderizar nada ni generar nonce.
  const botTrap = classifyBotTrap(pathname)
  if (botTrap) {
    logBotTrap(botTrap, request)

    return new NextResponse('Not found', {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  }

  if (SANDBOXED_APP_PATTERN.test(pathname)) {
    return NextResponse.next()
  }

  // crypto.randomUUID() da un token de 122 bits de entropía real — de
  // sobra para un nonce de un solo uso por request, no hace falta nada
  // más elaborado.
  const nonce = crypto.randomUUID()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const securityHeaders = buildSecurityHeaders({
    nonce,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL!,
    isDev: process.env.NODE_ENV === 'development',
    analyticsEnabled: Boolean(env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN),
  })

  // El propio Next.js busca el nonce en la cabecera Content-Security-
  // Policy de la PETICIÓN para aplicarlo a sus scripts de hidratación —
  // por eso va también en requestHeaders, no solo en la respuesta.
  requestHeaders.set(
    'Content-Security-Policy',
    securityHeaders['Content-Security-Policy'],
  )

  const response = isAdminRoute(pathname)
    ? await updateSession(request, requestHeaders)
    : NextResponse.next({ request: { headers: requestHeaders } })

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value)
  }

  if (isAdminRoute(pathname)) {
    response.headers.set('Cross-Origin-Opener-Policy', ADMIN_OPENER_POLICY)
    response.headers.set('Cross-Origin-Resource-Policy', ADMIN_RESOURCE_POLICY)
  }

  return response
}

export const config = {
  // Todo el sitio salvo los estáticos internos de Next — el propio
  // Next.js recomienda excluirlos por rendimiento, no tiene sentido que
  // el proxy los intercepte.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
