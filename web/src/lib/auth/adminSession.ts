import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'

/**
 * Comprobación de sesión de administrador para Server Actions y route
 * handlers del ABM (auditoría del 8 oct, P0-1).
 *
 * Una Server Action es un endpoint público: Next.js la ejecuta con un POST a
 * CUALQUIER ruta que lleve su id, no solo a la página que la usa, así que el
 * proxy de `/admin` no la protege. La RLS de Postgres sigue siendo la
 * barrera final, pero muchas acciones llaman antes a servicios externos
 * (Cloudinary, Cloudmersive) que no saben nada de RLS. Por eso cada acción
 * del ABM empieza comprobando la sesión aquí.
 */

export type AdminCheck =
  | { ok: true; email: string | null }
  | { ok: false; reason: 'unauthenticated' | 'forbidden' }

export const ADMIN_REQUIRED_MESSAGE =
  'Tu sesión ha caducado o no tienes permisos de administración. Vuelve a iniciar sesión.'

/**
 * Next usa excepciones para avisar de que una página es dinámica (al leer
 * `cookies()` durante el build) o de que hay que redirigir. Quien captura
 * errores alrededor de código que las puede lanzar tiene que dejarlas pasar:
 * si se tragan, la página se queda marcada como estática y el build lo
 * muestra como «Dynamic server usage».
 */
function isNextControlFlowError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false

  const digest = (error as { digest?: unknown }).digest

  return (
    typeof digest === 'string' &&
    (digest === 'DYNAMIC_SERVER_USAGE' ||
      digest === 'BAILOUT_TO_CLIENT_SIDE_RENDERING' ||
      digest.startsWith('NEXT_'))
  )
}

/**
 * Memoizada por petición con `React.cache`: una misma petición (la ruta de
 * CV, por ejemplo, pasa por el guard y por el actor) hace una sola vez
 * `getClaims` y `rpc('is_admin')`. No se comparte entre peticiones.
 */
const checkAdminSession = cache(async (): Promise<AdminCheck> => {
  try {
    const supabase = await createClient()

    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims()

    if (claimsError || !claimsData?.claims) {
      return { ok: false, reason: 'unauthenticated' }
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin')

    if (adminError || !isAdmin) {
      return { ok: false, reason: 'forbidden' }
    }

    const email = claimsData.claims.email

    return {
      ok: true,
      email: typeof email === 'string' && email ? email : null,
    }
  } catch (error) {
    if (isNextControlFlowError(error)) throw error

    console.error(error)
    return { ok: false, reason: 'unauthenticated' }
  }
})

/**
 * Quién es el admin de esta petición, para anotarlo en el registro de
 * actividad: su email, o `null` si no hay sesión de administrador. Hace la
 * misma comprobación que `isAdminRequest`.
 */
export async function getAdminActor(): Promise<{ email: string } | null> {
  const check = await checkAdminSession()

  return check.ok && check.email ? { email: check.email } : null
}

/**
 * Para las páginas del ABM que leen datos SIN RLS (talent usa la clave
 * secreta de su proyecto): comprueba la sesión en la propia página en vez
 * de fiarlo todo al proxy, y manda al login si no es admin. Un layout no
 * basta: Next no lo vuelve a renderizar en cada navegación.
 */
export async function requireAdminPage(): Promise<void> {
  if (!(await checkAdminSession()).ok) redirect('/admin/login')
}

/** Atajo para las Server Actions: true solo con sesión de admin válida. */
export async function isAdminRequest(): Promise<boolean> {
  return (await checkAdminSession()).ok
}

/**
 * Para route handlers de `/api/admin/*`: null si la petición es de un admin;
 * si no, la respuesta JSON 401/403 que hay que devolver tal cual.
 */
export async function adminApiGuard(): Promise<NextResponse | null> {
  const check = await checkAdminSession()

  if (check.ok) return null

  return check.reason === 'unauthenticated'
    ? NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    : NextResponse.json({ error: 'No autorizado' }, { status: 403 })
}
