'use server'

import { revalidatePath } from 'next/cache'

import { episodeSchema } from '@/modules/content/domain/episodeSchema'

import { upsertEpisode } from '@/modules/content/application/upsertEpisode'

import { getEpisode } from '@/modules/content/application/getEpisode'

import { getContent } from '@/modules/content/application/getContent'

export type EpisodeActionState = {
  fieldErrors?: {
    contentId?: string[]
    program?: string[]
    provider?: string[]
    embedId?: string[]
    episodeKind?: string[]
  }

  formError?: string
  success?: boolean
}

export async function saveEpisodeAction(
  _previousState: EpisodeActionState,
  formData: FormData,
): Promise<EpisodeActionState> {
  const contentId = formData.get('contentId')

  // Campos ocultos del formulario (número, invitado, cargo, empresa, fecha,
  // duración, idioma): no se editan, pero el upsert reemplaza la fila entera,
  // así que se reenvían tal cual para no borrar nada que ya estuviera en BBDD.
  let existing = null
  let defaultLocale = null

  if (typeof contentId === 'string') {
    try {
      existing = await getEpisode(contentId)

      if (!existing) {
        defaultLocale = (await getContent(contentId))?.defaultLocale ?? null
      }
    } catch (error) {
      console.error(error)

      return {
        formError: 'No se han podido guardar los datos del episodio.',
      }
    }
  }

  if (!existing && !defaultLocale) {
    return {
      formError: 'El contenido ya no existe.',
    }
  }

  const result = episodeSchema.safeParse({
    contentId,

    program: formData.get('program'),

    number: existing?.number ?? null,

    guest: existing?.guest ?? null,

    role: existing?.role ?? null,

    company: existing?.company ?? null,

    episodeDate: existing?.episodeDate ?? null,

    durationSeconds: existing?.durationSeconds ?? null,

    provider: formData.get('provider'),

    embedId: formData.get('embedId'),

    language: existing?.language ?? defaultLocale,

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
