'use server'

import { revalidatePath } from 'next/cache'

import { caseDetailSchema } from '@/modules/content/domain/caseDetailSchema'

import { upsertCaseDetail } from '@/modules/content/application/upsertCaseDetail'

export type CaseDetailActionState = {
  fieldErrors?: {
    contentId?: string[]
    force?: string[]
    client?: string[]
  }

  formError?: string
  success?: boolean
}

function nullableText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  return trimmed
}

export async function saveCaseDetailAction(
  _previousState: CaseDetailActionState,
  formData: FormData,
): Promise<CaseDetailActionState> {
  const result = caseDetailSchema.safeParse({
    contentId: formData.get('contentId'),

    force: Number(formData.get('force')),

    client: nullableText(formData.get('client')),
  })

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
    }
  }

  try {
    await upsertCaseDetail(result.data)
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes('Content is not a case')
    ) {
      return {
        formError: 'Este contenido no es de tipo Case.',
      }
    }

    if (error instanceof Error && error.message.includes('Content not found')) {
      return {
        formError: 'El contenido ya no existe.',
      }
    }

    return {
      formError: 'No se han podido guardar los datos del Case.',
    }
  }

  revalidatePath(`/admin/contents/${result.data.contentId}/edit`)

  return {
    success: true,
  }
}
