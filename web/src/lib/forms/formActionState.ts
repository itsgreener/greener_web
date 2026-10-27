import { z } from 'zod'

/**
 * Estado que devuelve una Server Action de formulario a `useActionState`:
 * errores por campo (`fieldErrors`), un error general (`formError`) y, si
 * el formulario lo muestra, el aviso de éxito. Las ~12 acciones del ABM y
 * del sitio público tenían cada una su copia de esta forma.
 *
 * `TField` lista los campos del formulario para que `fieldErrors.slug` esté
 * tipado y `fieldErrors.slg` no compile.
 */
export type FormActionState<TField extends string = string> = {
  fieldErrors?: Partial<Record<TField, string[]>>

  formError?: string

  success?: boolean
}

/**
 * Errores por campo de un `safeParse` fallido, listos para `fieldErrors` de
 * un `FormActionState`. Sustituye a `error.flatten().fieldErrors`, obsoleto
 * en zod 4 (`z.flattenError`).
 */
export function fieldErrorsOf<T>(error: z.ZodError<T>) {
  return z.flattenError(error).fieldErrors
}

/**
 * Fallo de un caso de uso de formulario: errores por campo o un error
 * general. Es la forma común de `SubmitContactFormResult` y de
 * `SubscribeToNewsletterResult` cuando `ok` es `false`.
 */
export type FormFailure =
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; formError: string }

/** Estado de la Server Action a partir del fallo de su caso de uso. */
export function toFormState(failure: FormFailure): FormActionState {
  if ('fieldErrors' in failure) return { fieldErrors: failure.fieldErrors }

  return { formError: failure.formError }
}
