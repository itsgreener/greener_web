import { NextResponse } from 'next/server'

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
  { ok: true } | { ok: false; reason: 'unauthenticated' | 'forbidden' }

export const ADMIN_REQUIRED_MESSAGE =
  'Tu sesión ha caducado o no tienes permisos de administración. Vuelve a iniciar sesión.'

export async function checkAdminSession(): Promise<AdminCheck> {
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

    return { ok: true }
  } catch (error) {
    console.error(error)
    return { ok: false, reason: 'unauthenticated' }
  }
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
