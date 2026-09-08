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
    },
  )

  // Se calcula con el URL estándar (no request.nextUrl.pathname): más
  // predecible entre entornos/versiones al construir la comparación de
  // rutas — nextUrl.clone() se sigue usando más abajo para construir el
  // propio redirect, donde sí hace falta.
  const pathname = new URL(request.url).pathname

  // El login tiene que ser accesible sin sesión
  if (pathname === '/admin/login') {
    await supabase.auth.getClaims()
    return response
  }

  // Las rutas API (firma de Cloudinary, etc.) no deben recibir una
  // redirección HTML si falla la comprobación: el cliente hace fetch()
  // esperando JSON, y seguir un redirect a /admin/login le devolvería la
  // página de login como si fuera un 200. Los propios route handlers ya
  // repiten esta comprobación (getClaims + is_admin) como segunda barrera
  // — esto es solo la primera, para no depender de que cada ruta nueva se
  // acuerde de hacerlo.
  const isApiRoute = pathname.startsWith('/api/admin/')

  // Verificar que existe un JWT válido
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims()

  if (claimsError || !claimsData?.claims) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const url = request.nextUrl.clone()

    url.pathname = '/admin/login'
    url.search = ''

    return NextResponse.redirect(url)
  }

  // Verificar que el dominio sigue autorizado
  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin')

  if (adminError || !isAdmin) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const url = request.nextUrl.clone()

    url.pathname = '/admin/login'
    url.search = '?error=unauthorized'

    return NextResponse.redirect(url)
  }

  return response
}
