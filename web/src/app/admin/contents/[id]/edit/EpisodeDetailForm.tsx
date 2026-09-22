'use client'

import { useActionState } from 'react'

import {
  episodeProgramSchema,
  episodeProviderSchema,
  episodeKindSchema,
  type Episode,
} from '@/modules/content/domain/episodeSchema'

import { localeSchema } from '@/modules/content/domain/contentSchema'

import { saveEpisodeAction, type EpisodeActionState } from './episodeActions'

type Props = {
  contentId: string
  episode: Episode | null
}

const initialState: EpisodeActionState = {}

const PROGRAM_LABEL: Record<string, string> = {
  brand_the_future: 'Brand the Future',
  brand_into_europe: 'Brand into Europe',
  brand_to_table: 'Brand to Table',
}

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
              {PROGRAM_LABEL[option] ?? option}
            </option>
          ))}
        </select>

        {state.fieldErrors?.program?.[0] && (
          <p>{state.fieldErrors.program[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="number">Número de episodio</label>

        <input
          id="number"
          name="number"
          type="number"
          min={1}
          defaultValue={episode?.number ?? ''}
        />

        {state.fieldErrors?.number?.[0] && <p>{state.fieldErrors.number[0]}</p>}
      </div>

      <div>
        <label htmlFor="guest">Invitado</label>

        <input
          id="guest"
          name="guest"
          type="text"
          defaultValue={episode?.guest ?? ''}
        />

        {state.fieldErrors?.guest?.[0] && <p>{state.fieldErrors.guest[0]}</p>}
      </div>

      <div>
        <label htmlFor="role">Cargo del invitado</label>

        <input
          id="role"
          name="role"
          type="text"
          defaultValue={episode?.role ?? ''}
        />

        {state.fieldErrors?.role?.[0] && <p>{state.fieldErrors.role[0]}</p>}
      </div>

      <div>
        <label htmlFor="company">Empresa del invitado</label>

        <input
          id="company"
          name="company"
          type="text"
          defaultValue={episode?.company ?? ''}
        />

        {state.fieldErrors?.company?.[0] && (
          <p>{state.fieldErrors.company[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="episodeDate">Fecha del episodio</label>

        <input
          id="episodeDate"
          name="episodeDate"
          type="date"
          defaultValue={episode?.episodeDate ?? ''}
        />

        {state.fieldErrors?.episodeDate?.[0] && (
          <p>{state.fieldErrors.episodeDate[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="durationSeconds">Duración (segundos)</label>

        <input
          id="durationSeconds"
          name="durationSeconds"
          type="number"
          min={1}
          defaultValue={episode?.durationSeconds ?? ''}
        />

        {state.fieldErrors?.durationSeconds?.[0] && (
          <p>{state.fieldErrors.durationSeconds[0]}</p>
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
        <label htmlFor="language">Idioma</label>

        <select
          id="language"
          name="language"
          defaultValue={episode?.language ?? localeSchema.options[0]}
        >
          {localeSchema.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {state.fieldErrors?.language?.[0] && (
          <p>{state.fieldErrors.language[0]}</p>
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
