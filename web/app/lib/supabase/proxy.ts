import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          supabaseResponse = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Verifica el JWT y refresca la sesión si hace falta
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims()

  const isAdminRoute =
    request.nextUrl.pathname.startsWith('/admin')

  const isLoginRoute =
    request.nextUrl.pathname === '/admin/login'

  // Si no estamos en /admin, no hacemos más comprobaciones
  if (!isAdminRoute) {
    return supabaseResponse
  }

  // /admin/login tiene que poder abrirse sin sesión
  if (isLoginRoute) {
    return supabaseResponse
  }

  // No hay sesión válida
  if (claimsError || !claimsData?.claims) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.search = ''

    return NextResponse.redirect(url)
  }

  // Segunda comprobación:
  // ¿el dominio sigue estando autorizado?
  const { data: isAdmin, error: adminError } =
    await supabase.rpc('is_admin')

  if (adminError || !isAdmin) {
    await supabase.auth.signOut()

    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.search = '?error=unauthorized'

    return NextResponse.redirect(url)
  }

  return supabaseResponse
}