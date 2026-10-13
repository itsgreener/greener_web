'use server'

import { ADMIN_REQUIRED_MESSAGE, isAdminRequest } from '@/lib/auth/adminSession'

import { revalidatePath } from 'next/cache'
import { invalidateFeedCache } from '@/lib/cache/feedCache'

import { adminErrorMessage } from '@/app/admin/_lib/adminErrorMessage'

import { contentTranslationSchema } from '@/modules/content/domain/contentTranslationSchema'

import { upsertContentTranslation } from '@/modules/content/container'
import {
  fieldErrorsOf,
  type FormActionState,
} from '@/lib/forms/formActionState'

export type TranslationActionState = FormActionState<
  | 'contentId'
  | 'locale'
  | 'title'
  | 'seoTitle'
  | 'seoDescription'
  | 'summary'
  | 'highlight'
  | 'body'
>

function nullableText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  return trimmed === '' ? null : trimmed
}

export async function saveTranslationAction(
  _previousState: TranslationActionState,
  formData: FormData,
): Promise<TranslationActionState> {
  if (!(await isAdminRequest())) return { formError: ADMIN_REQUIRED_MESSAGE }

  const result = contentTranslationSchema.safeParse({
    contentId: formData.get('contentId'),

    locale: formData.get('locale'),

    title: formData.get('title'),

    seoTitle: nullableText(formData.get('seoTitle')),

    seoDescription: nullableText(formData.get('seoDescription')),

    summary: nullableText(formData.get('summary')),

    highlight: nullableText(formData.get('highlight')),

    body: nullableText(formData.get('body')),
  })

  if (!result.success) {
    return {
      fieldErrors: fieldErrorsOf(result.error),
    }
  }

  try {
    await upsertContentTranslation(result.data)
  } catch (error) {
    console.error(error)

    return {
      formError: adminErrorMessage(
        error,
        'No se ha podido guardar la traducción.',
        ['episode_locale_only', 'not_found'],
      ),
    }
  }

  revalidatePath(`/admin/contents/${result.data.contentId}/edit`)

  revalidatePath('/admin/contents')

  invalidateFeedCache()

  return {
    success: true,
  }
}
