'use server'

import { ADMIN_REQUIRED_MESSAGE, isAdminRequest } from '@/lib/auth/adminSession'

import { revalidatePath } from 'next/cache'
import { invalidateFeedCache } from '@/lib/cache/feedCache'

import { adminErrorMessage } from '@/app/admin/_lib/adminErrorMessage'

import { caseDetailSchema } from '@/modules/content/domain/caseDetailSchema'

import { upsertCaseDetail } from '@/modules/content/container'
import {
  fieldErrorsOf,
  type FormActionState,
} from '@/lib/forms/formActionState'

export type CaseDetailActionState = FormActionState<
  'contentId' | 'force' | 'client'
>

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
  if (!(await isAdminRequest())) return { formError: ADMIN_REQUIRED_MESSAGE }

  const result = caseDetailSchema.safeParse({
    contentId: formData.get('contentId'),

    force: Number(formData.get('force')),

    client: nullableText(formData.get('client')),
  })

  if (!result.success) {
    return {
      fieldErrors: fieldErrorsOf(result.error),
    }
  }

  try {
    await upsertCaseDetail(result.data)
  } catch (error) {
    console.error(error)

    return {
      formError: adminErrorMessage(
        error,
        'No se han podido guardar los datos del Case.',
        ['not_a_case', 'not_found'],
      ),
    }
  }

  revalidatePath(`/admin/contents/${result.data.contentId}/edit`)
  invalidateFeedCache()

  return {
    success: true,
  }
}
