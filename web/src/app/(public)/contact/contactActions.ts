'use server'

import { submitContactForm } from '@/modules/contact/container'
import { toFormState, type FormActionState } from '@/lib/forms/formActionState'
import { readHoneypot } from '@/lib/forms/honeypot'
import {
  CONTACT_LIMITS,
  type ContactField,
} from '@/modules/contact/domain/contactLimits'

export type ContactActionState = FormActionState<ContactField>

const CONTACT_FIELDS = Object.keys(CONTACT_LIMITS) as ContactField[]

/**
 * Lo que la persona escribió, para devolvérselo cuando el envío falla: React
 * 19 reinicia el formulario al terminar la acción y, sin esto, perdería el
 * mensaje. Se recorta a la longitud máxima de cada campo para no devolver
 * una carga mayor que la que el formulario admite.
 */
function submittedValues(formData: FormData): Record<ContactField, string> {
  const values = {} as Record<ContactField, string>

  for (const field of CONTACT_FIELDS) {
    const raw = formData.get(field)
    values[field] =
      typeof raw === 'string' ? raw.slice(0, CONTACT_LIMITS[field]) : ''
  }

  return values
}

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

  if (!result.ok) {
    return { ...toFormState(result), values: submittedValues(formData) }
  }

  return { success: true }
}
