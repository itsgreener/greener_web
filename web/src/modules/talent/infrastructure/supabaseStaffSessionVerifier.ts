import 'server-only'

import { getTalentClient } from '@/modules/talent/infrastructure/talentSupabaseClient'
import type { StaffSessionVerifier } from '@/modules/talent/domain/talentPorts'

/**
 * Valida el `access_token` de la sesión de Google que la web antigua tiene
 * abierta en Supabase-talent: se lo pregunta a Auth (`getUser`), que comprueba
 * firma, caducidad y que la sesión siga viva. No se decodifica el JWT a mano.
 * Exige correo confirmado (el de Google lo está siempre).
 */
export const supabaseStaffSessionVerifier: StaffSessionVerifier = {
  async verify(accessToken) {
    try {
      const { data, error } = await getTalentClient().auth.getUser(accessToken)

      if (error || !data.user?.email || !data.user.email_confirmed_at) {
        return null
      }

      return { email: data.user.email }
    } catch {
      return null
    }
  },
}
