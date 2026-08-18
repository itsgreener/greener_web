import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // El login tiene que ser accesible sin sesión
  if (pathname === '/admin/login') {
    await supabase.auth.getClaims()
    return response
  }

  // Verificar que existe un JWT válido
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims()

  if (claimsError || !claimsData?.claims) {
    const url = request.nextUrl.clone()

    url.pathname = '/admin/login'
    url.search = ''

    return NextResponse.redirect(url)
  }

  // Verificar que el dominio sigue autorizado
  const { data: isAdmin, error: adminError } =
    await supabase.rpc('is_admin')

  if (adminError || !isAdmin) {
    const url = request.nextUrl.clone()

    url.pathname = '/admin/login'
    url.search = '?error=unauthorized'

    return NextResponse.redirect(url)
  }

  return response
}