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
 * no con el origen de la petición (auditoría 8 oct): detrás del proxy de
 * Dinahosting, la URL que ve Next puede ser la interna (localhost:<puerto>).
 * Si no está definida se mantiene el origen de la petición, como antes, para
 * no mandar el login de producción a localhost (el valor por defecto de env).
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
      return NextResponse.redirect(`${siteUrl}${next}`)
    }
  }

  return NextResponse.redirect(`${siteUrl}/admin/login?error=oauth`)
}
