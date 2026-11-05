import { NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

/**
 * Solo rutas internas: empieza por "/" pero no por "//" ni "/\" (que el
 * navegador interpretaría como otra web).
 */
function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || /^\/[/\\]/.test(value)) {
    return '/admin'
  }
  return value
}

/**
 * La redirección se construye con NEXT_PUBLIC_SITE_URL cuando está definida,
 * no con el origen de la petición: detrás del proxy de
 * Dinahosting, la URL que ve Next puede ser la interna (localhost:<puerto>).
 * Si no está definida se mantiene el origen de la petición, para no mandar el
 * login de producción a localhost (el valor por defecto de env).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? env.NEXT_PUBLIC_SITE_URL
    : origin

  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Auditoría de seguridad del 23 oct, SEC-ADM-A3a: cualquier cuenta de
      // Google completa el OAuth. Aquí se comprueba que además sea de un
      // dominio autorizado (`is_admin`), y si no se cierra la sesión que
      // acaba de crearse: una cuenta ajena no debe quedarse con una sesión
      // `authenticated` de Supabase. Falla cerrado ante cualquier error.
      // `signOut` local, para no tocar otras sesiones de esa persona.
      const { data: isAdmin, error: adminError } =
        await supabase.rpc('is_admin')

      if (adminError || !isAdmin) {
        await supabase.auth.signOut({ scope: 'local' })

        return NextResponse.redirect(
          `${siteUrl}/admin/login?error=unauthorized`,
        )
      }

      return NextResponse.redirect(`${siteUrl}${next}`)
    }
  }

  return NextResponse.redirect(`${siteUrl}/admin/login?error=oauth`)
}
