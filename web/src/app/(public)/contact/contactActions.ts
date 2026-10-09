'use server'

import { submitContactForm } from '@/modules/contact/application/submitContactForm'
import type { FormActionState } from '@/lib/forms/formActionState'

export type ContactActionState = FormActionState

/**
 * El campo honeypot vive en el propio <input> del formulario con el
 * name "website" (ContactForm.tsx) — un nombre plausible para que un
 * bot que rellena formularios sin mirar lo complete, pero que un
 * visitante real nunca ve ni rellena (oculto por CSS, no por
 * display:none/type=hidden, que algunos bots más cuidadosos evitan).
 */
export async function submitContactAction(
  _previousState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const honeypot = (formData.get('website') as string | null) ?? ''

  const result = await submitContactForm(
    {
      name: formData.get('name'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      message: formData.get('message'),
      privacyConsent: formData.get('privacyConsent') === 'on',
    },
    honeypot,
  )

  if (!result.ok) {
    if ('fieldErrors' in result) {
      return { fieldErrors: result.fieldErrors }
    }
    return { formError: result.formError }
  }

  return { success: true }
}
