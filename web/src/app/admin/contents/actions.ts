'use server'

import { ADMIN_REQUIRED_MESSAGE, isAdminRequest } from '@/lib/auth/adminSession'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createContentSchema } from '@/modules/content/domain/contentSchema'

import { createContent } from '@/modules/content/application/createContent'
import {
  fieldErrorsOf,
  type FormActionState,
} from '@/lib/forms/formActionState'

export type CreateContentActionState = FormActionState<
  'type' | 'slug' | 'defaultLocale' | 'title'
>

export async function createContentAction(
  _previousState: CreateContentActionState,
  formData: FormData,
): Promise<CreateContentActionState> {
  if (!(await isAdminRequest())) return { formError: ADMIN_REQUIRED_MESSAGE }

  const result = createContentSchema.safeParse({
    type: formData.get('type'),
    slug: formData.get('slug'),
    defaultLocale: formData.get('defaultLocale'),
    title: formData.get('title'),
  })

  if (!result.success) {
    return {
      fieldErrors: fieldErrorsOf(result.error),
    }
  }

  let contentId: string

  try {
    contentId = await createContent(result.data)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === '23505') {
      return {
        fieldErrors: {
          slug: ['Este slug ya existe'],
        },
      }
    }

    console.error(error)

    return {
      formError: 'No se ha podido crear el contenido.',
    }
  }

  // El formulario de creación solo pide lo mínimo para el esqueleto
  // (tipo, título, slug, idioma). El resto — textos largos, SEO, medios —
  // se rellena inmediatamente después en la pantalla de edición completa,
  // que pasa a ser el único sitio con el 100% de los campos: la creación
  // ya no es un paso "a medias" que haya que recordar terminar más tarde.
  revalidatePath('/admin/contents')

  redirect(`/admin/contents/${contentId}/edit`)
}
