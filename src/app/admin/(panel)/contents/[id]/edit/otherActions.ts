'use server'

import { revalidatePath } from 'next/cache'
import { ADMIN_REQUIRED_MESSAGE, isAdminRequest } from '@/lib/auth/adminSession'

import { invalidateFeedCache } from '@/lib/cache/feedCache'

import { adminErrorMessage } from '@/app/admin/_lib/adminErrorMessage'

import { updateOtherFrequencySchema } from '@/modules/content/domain/otherSchema'

import { updateOtherFrequency } from '@/modules/content/container'
import {
  fieldErrorsOf,
  type FormActionState,
} from '@/lib/forms/formActionState'

export type OtherFrequencyActionState = FormActionState<
  'contentId' | 'frequency'
>

export async function saveOtherFrequencyAction(
  _previousState: OtherFrequencyActionState,
  formData: FormData,
): Promise<OtherFrequencyActionState> {
  if (!(await isAdminRequest())) return { formError: ADMIN_REQUIRED_MESSAGE }

  const result = updateOtherFrequencySchema.safeParse({
    contentId: formData.get('contentId'),

    frequency: Number(formData.get('frequency')),
  })

  if (!result.success) {
    return {
      fieldErrors: fieldErrorsOf(result.error),
    }
  }

  try {
    await updateOtherFrequency(result.data)
  } catch (error) {
    console.error('Admin · saveOtherFrequencyAction:', error)

    return {
      formError: adminErrorMessage(
        error,
        'No se ha podido guardar la frecuencia.',
        ['not_found', 'other_kind_required'],
      ),
    }
  }

  revalidatePath(`/admin/contents/${result.data.contentId}/edit`)
  invalidateFeedCache()

  return {
    success: true,
  }
}
