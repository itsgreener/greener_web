'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

/**
 * Cierra la sesión del ABM (auditoría de seguridad del 23 oct, SEC-ADM-A1).
 *
 * A propósito NO exige sesión de administrador: quien tiene una sesión
 * caducada o sin permisos también debe poder salir. Es la única acción del
 * ABM sin guarda, y está en la lista de excepciones del test estructural.
 *
 * `scope: 'local'` revoca solo la sesión de este navegador; el valor por
 * defecto de Supabase (`global`) cerraría también la sesión de la misma
 * persona en otros dispositivos.
 */
export async function signOutAction(): Promise<void> {
  try {
    const supabase = await createClient()

    await supabase.auth.signOut({ scope: 'local' })
  } catch (error) {
    // Aunque falle la revocación en Supabase, se sigue: las cookies se
    // intentan borrar igualmente y se vuelve al login.
    console.error('Auth: no se pudo cerrar la sesión', error)
  }

  redirect('/admin/login')
}
