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
