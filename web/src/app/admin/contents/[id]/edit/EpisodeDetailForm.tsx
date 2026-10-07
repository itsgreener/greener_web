'use client'

import { EPISODE_PROGRAM_LABEL } from '@/modules/content/domain/episodeLabels'
import { useActionState } from 'react'

import {
  episodeProgramSchema,
  episodeProviderSchema,
  episodeKindSchema,
  type Episode,
} from '@/modules/content/domain/episodeSchema'

import { saveEpisodeAction, type EpisodeActionState } from './episodeActions'

type Props = {
  contentId: string
  episode: Episode | null
}

const initialState: EpisodeActionState = {}

/**
 * Solo se muestran los campos que la ficha pública, el feed o la analítica
 * leen de verdad (programa, tipo, proveedor, embed). Número, invitado, cargo,
 * empresa, fecha, duración e idioma siguen en BBDD pero no se editan aquí:
 * `saveEpisodeAction` conserva lo que ya hubiera guardado.
 */
export default function EpisodeDetailForm({ contentId, episode }: Props) {
  const [state, formAction, pending] = useActionState(
    saveEpisodeAction,
    initialState,
  )

  return (
    <form action={formAction}>
      <input type="hidden" name="contentId" value={contentId} />

      <div>
        <label htmlFor="program">Programa</label>

        <select
          id="program"
          name="program"
          defaultValue={episode?.program ?? episodeProgramSchema.options[0]}
        >
          {episodeProgramSchema.options.map((option) => (
            <option key={option} value={option}>
              {EPISODE_PROGRAM_LABEL[option]}
            </option>
          ))}
        </select>

        {state.fieldErrors?.program?.[0] && (
          <p>{state.fieldErrors.program[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="provider">Proveedor</label>

        <select
          id="provider"
          name="provider"
          defaultValue={episode?.provider ?? episodeProviderSchema.options[0]}
        >
          {episodeProviderSchema.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {state.fieldErrors?.provider?.[0] && (
          <p>{state.fieldErrors.provider[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="embedId">
          ID del embed (el propio proveedor, no una URL completa)
        </label>

        <input
          id="embedId"
          name="embedId"
          type="text"
          defaultValue={episode?.embedId ?? ''}
        />

        {state.fieldErrors?.embedId?.[0] && (
          <p>{state.fieldErrors.embedId[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="episodeKind">Tipo de episodio</label>

        <select
          id="episodeKind"
          name="episodeKind"
          defaultValue={episode?.episodeKind ?? episodeKindSchema.options[0]}
        >
          {episodeKindSchema.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {state.fieldErrors?.episodeKind?.[0] && (
          <p>{state.fieldErrors.episodeKind[0]}</p>
        )}
      </div>

      {state.formError && <p>{state.formError}</p>}

      {state.success && <p>Datos del episodio guardados correctamente.</p>}

      <button type="submit" disabled={pending}>
        {pending ? 'Guardando...' : 'Guardar datos del episodio'}
      </button>
    </form>
  )
}
