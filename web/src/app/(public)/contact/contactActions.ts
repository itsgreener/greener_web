'use server'

import { submitContactForm } from '@/modules/contact/container'
import { toFormState, type FormActionState } from '@/lib/forms/formActionState'
import { readHoneypot } from '@/lib/forms/honeypot'

export type ContactActionState = FormActionState

/**
 * El campo honeypot vive en el propio <input> del formulario con el
 * name "reference_code" (ContactForm.tsx) — un nombre que un bot que
 * rellena formularios sin mirar completa, pero que el autorrelleno del
 * navegador no reconoce (con «website» Chrome lo rellenaba solo). Un
 * visitante real nunca ve ni rellena (oculto por CSS, no por
 * display:none/type=hidden, que algunos bots más cuidadosos evitan).
 */
export async function submitContactAction(
  _previousState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const honeypot = readHoneypot(formData, 'reference_code')

  const result = await submitContactForm(
    {
      name: formData.get('name'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      message: formData.get('message'),
    },
    honeypot,
  )

  if (!result.ok) return toFormState(result)

  return { success: true }
}
