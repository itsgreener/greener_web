import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import { buildSecurityHeaders } from '@/lib/securityHeaders'
import { env } from '@/lib/env'

// especificacion-final-formato-detalle.md / contrato-zip-tools-insights.md
// §12.4: estas rutas llevan su propia CSP, pensada para el contrato del
// ZIP. Dos cabeceras Content-Security-Policy en la misma respuesta no se
// sustituyen, se combinan — nunca deben tocarse aquí, ni con el nonce ni
// con el resto de cabeceras globales.
const SANDBOXED_APP_PATTERN = /^\/(tools|insights)\/[^/]+\/app(\/.*)?$/

function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
}

/**
 * Cabeceras de seguridad globales (arquitectura §17.1) + verificación de
 * dominio del ABM (§15.2, ya existía). Decisión del 22 de septiembre:
 * nonce + 'strict-dynamic' para script-src, siguiendo el mecanismo que
 * el propio Next.js documenta — ver `src/lib/securityHeaders.ts` para el
 * porqué de cada directiva.
 */
export async function proxy(request: NextRequest) {
  const pathname = new URL(request.url).pathname

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

  return response
}

export const config = {
  // Todo el sitio salvo los estáticos internos de Next — el propio
  // Next.js recomienda excluirlos por rendimiento, no tiene sentido que
  // el proxy los intercepte.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
