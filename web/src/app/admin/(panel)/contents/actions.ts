'use server'

import { ADMIN_REQUIRED_MESSAGE, isAdminRequest } from '@/lib/auth/adminSession'

import { randomBytes } from 'node:crypto'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { isDomainError } from '@/modules/shared/domain/domainError'

import { createContentSchema } from '@/modules/content/domain/contentSchema'
import {
  createOtherSchema,
  newsletterDraftDefaults,
} from '@/modules/content/domain/otherSchema'

import { createContent, createOther } from '@/modules/content/container'
import {
  fieldErrorsOf,
  type FormActionState,
} from '@/lib/forms/formActionState'

export type CreateContentActionState = FormActionState<
  'type' | 'slug' | 'defaultLocale' | 'title' | 'kind' | 'frequency'
>

export async function createContentAction(
  _previousState: CreateContentActionState,
  formData: FormData,
): Promise<CreateContentActionState> {
  if (!(await isAdminRequest())) return { formError: ADMIN_REQUIRED_MESSAGE }

  // Una newsletter no pide título, slug ni idioma en el formulario (no tiene
  // página: su titular se escribe en el editor). Se rellenan aquí con valores
  // por defecto, y solo si el formulario no los envía.
  const isNewsletter =
    formData.get('type') === 'other' && formData.get('kind') === 'newsletter'

  const generated = isNewsletter
    ? newsletterDraftDefaults(randomBytes(4).toString('hex'))
    : null

  const common = {
    slug: formData.get('slug') ?? generated?.slug ?? null,
    defaultLocale:
      formData.get('defaultLocale') ?? generated?.defaultLocale ?? null,
    title: formData.get('title') ?? generated?.title ?? null,
  }

  // Un `other` se crea con su subtipo y su frecuencia (plan de other, §7.1):
  // no existe sin ellos, y el subtipo no se puede cambiar después.
  let creation: () => Promise<string>

  if (formData.get('type') === 'other') {
    const other = createOtherSchema.safeParse({
      ...common,
      kind: formData.get('kind'),
      frequency: Number(formData.get('frequency')),
    })

    if (!other.success) {
      return { fieldErrors: fieldErrorsOf(other.error) }
    }

    creation = () => createOther(other.data)
  } else {
    const content = createContentSchema.safeParse({
      ...common,
      type: formData.get('type'),
    })

    if (!content.success) {
      return { fieldErrors: fieldErrorsOf(content.error) }
    }

    creation = () => createContent(content.data)
  }

  let contentId: string

  try {
    contentId = await creation()
  } catch (error) {
    if (isDomainError(error, 'duplicate')) {
      // El slug de una newsletter lo genera el servidor: el visitante no tiene
      // ningún campo donde ver el error, y basta con volver a intentarlo.
      if (generated && formData.get('slug') === null) {
        return {
          formError: 'No se ha podido crear el contenido. Inténtalo de nuevo.',
        }
      }

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
