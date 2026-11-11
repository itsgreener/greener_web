'use server'

import { revalidatePath } from 'next/cache'
import { ADMIN_REQUIRED_MESSAGE, isAdminRequest } from '@/lib/auth/adminSession'

import { invalidateFeedCache } from '@/lib/cache/feedCache'

import { adminErrorMessage } from '@/app/admin/_lib/adminErrorMessage'

import { episodeSchema } from '@/modules/content/domain/episodeSchema'

import {
  contents,
  episodes,
  setEpisodePinsCarousel,
  upsertEpisode,
} from '@/modules/content/container'

import {
  fieldErrorsOf,
  type FormActionState,
} from '@/lib/forms/formActionState'

export type EpisodeActionState = FormActionState<
  'contentId' | 'program' | 'provider' | 'embedId' | 'episodeKind'
>

export async function saveEpisodeAction(
  _previousState: EpisodeActionState,
  formData: FormData,
): Promise<EpisodeActionState> {
  if (!(await isAdminRequest())) return { formError: ADMIN_REQUIRED_MESSAGE }

  const contentId = formData.get('contentId')

  // Campos ocultos del formulario (número, invitado, cargo, empresa, fecha,
  // duración, idioma): no se editan, pero el upsert reemplaza la fila entera,
  // así que se reenvían tal cual para no borrar nada que ya estuviera en BBDD.
  let existing = null
  let defaultLocale = null

  if (typeof contentId === 'string') {
    try {
      existing = await episodes.getByContentId(contentId)

      if (!existing) {
        defaultLocale =
          (await contents.getById(contentId))?.defaultLocale ?? null
      }
    } catch (error) {
      console.error('Admin · saveEpisodeAction:', error)

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
      fieldErrors: fieldErrorsOf(result.error),
    }
  }

  try {
    await upsertEpisode(result.data)
  } catch (error) {
    console.error('Admin · saveEpisodeAction:', error)

    return {
      formError: adminErrorMessage(
        error,
        'No se han podido guardar los datos del episodio.',
        ['not_an_episode', 'not_found'],
      ),
    }
  }

  revalidatePath(`/admin/contents/${result.data.contentId}/edit`)
  invalidateFeedCache()

  return {
    success: true,
  }
}

export type SetPinsCarouselResult =
  { ok: true; enabled: boolean } | { ok: false; error: string }

/**
 * Activa o desactiva que los pines de un episodio formen un único carrusel en
 * el feed (§2.150). La casilla de la carga masiva la llama ANTES de subir el
 * primer archivo; la de la lista de pines, cuando ya hay pines. Si no se puede
 * activar (los pines tienen ratios distintos) devuelve el motivo y no cambia
 * nada.
 */
export async function setPinsCarouselAction(
  contentId: string,
  enabled: boolean,
): Promise<SetPinsCarouselResult> {
  if (!(await isAdminRequest()))
    return { ok: false, error: ADMIN_REQUIRED_MESSAGE }

  try {
    const value = await setEpisodePinsCarousel({ id: contentId, enabled })

    revalidatePath(`/admin/contents/${contentId}/edit`)
    invalidateFeedCache()

    return { ok: true, enabled: value }
  } catch (error) {
    console.error('Admin · setPinsCarouselAction:', error)

    return {
      ok: false,
      error: adminErrorMessage(
        error,
        'No se ha podido cambiar el carrusel de pines.',
        ['not_an_episode', 'not_found', 'carousel_ratio_mismatch'],
      ),
    }
  }
}
