import { NextResponse } from 'next/server'

import { PACKAGE_BASE_SECURITY_HEADERS } from '@/lib/http/packageSecurityHeaders'
import {
  PackageNotFoundError,
  PackageSourceUnavailableError,
} from '@/modules/packages/domain/manifest'

/**
 * Traduce los errores esperables de leer un paquete publicado: no existe →
 * 404; Supabase/Storage no responde → 503 con `Retry-After` (antes se veía
 * como un 404 y un corte de Supabase parecía «la tool se ha borrado»).
 * Devuelve `null` si el error es otro, para que el llamante lo relance.
 *
 * Estas rutas no pasan por el proxy, así que las cabeceras de seguridad
 * también hay que ponerlas en las respuestas de error (SEC-PUB-B2).
 */
export function packageErrorResponse(
  error: unknown,
  notFoundBody: string,
): NextResponse | null {
  if (error instanceof PackageNotFoundError) {
    return new NextResponse(notFoundBody, {
      status: 404,
      headers: { ...PACKAGE_BASE_SECURITY_HEADERS },
    })
  }

  if (error instanceof PackageSourceUnavailableError) {
    return new NextResponse(
      'Servicio no disponible, inténtalo en unos segundos',
      {
        status: 503,
        headers: { 'Retry-After': '30', ...PACKAGE_BASE_SECURITY_HEADERS },
      },
    )
  }

  return null
}
