import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'

/**
 * `requestHeaders` (opcional, decisión del 22 sep): las cabeceras que
 * verá el render downstream (páginas del ABM incluidas) en vez de las
 * originales de `request` — así `src/proxy.ts` puede pasar aquí las
 * mismas cabeceras con el nonce de CSP ya inyectado, y las páginas del
 * ABM también hidratan bien bajo la CSP global. Por defecto, las
 * cabeceras originales de `request` — mismo comportamiento que antes de
 * este parámetro para quien llame a `updateSession` sin él (como sigue
 * haciendo `updateSession.test.ts`).
 */
export async function updateSession(
  request: NextRequest,
  requestHeaders: Headers = request.headers,
) {
  let response = NextResponse.next({
    request: { headers: requestHeaders },
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
            request: { headers: requestHeaders },
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
