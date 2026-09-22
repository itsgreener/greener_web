'use server'

import { revalidatePath } from 'next/cache'

import { episodeSchema } from '@/modules/content/domain/episodeSchema'

import { upsertEpisode } from '@/modules/content/application/upsertEpisode'

export type EpisodeActionState = {
  fieldErrors?: {
    contentId?: string[]
    program?: string[]
    number?: string[]
    guest?: string[]
    role?: string[]
    company?: string[]
    episodeDate?: string[]
    durationSeconds?: string[]
    provider?: string[]
    embedId?: string[]
    language?: string[]
    episodeKind?: string[]
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

function nullableNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

export async function saveEpisodeAction(
  _previousState: EpisodeActionState,
  formData: FormData,
): Promise<EpisodeActionState> {
  const result = episodeSchema.safeParse({
    contentId: formData.get('contentId'),

    program: formData.get('program'),

    number: nullableNumber(formData.get('number')),

    guest: nullableText(formData.get('guest')),

    role: nullableText(formData.get('role')),

    company: nullableText(formData.get('company')),

    episodeDate: nullableText(formData.get('episodeDate')),

    durationSeconds: nullableNumber(formData.get('durationSeconds')),

    provider: formData.get('provider'),

    embedId: formData.get('embedId'),

    language: formData.get('language'),

    episodeKind: formData.get('episodeKind'),
  })

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
    }
  }

  try {
    await upsertEpisode(result.data)
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes('Content is not an episode')
    ) {
      return {
        formError: 'Este contenido no es de tipo Episode.',
      }
    }

    if (error instanceof Error && error.message.includes('Content not found')) {
      return {
        formError: 'El contenido ya no existe.',
      }
    }

    return {
      formError: 'No se han podido guardar los datos del episodio.',
    }
  }

  revalidatePath(`/admin/contents/${result.data.contentId}/edit`)

  return {
    success: true,
  }
}
