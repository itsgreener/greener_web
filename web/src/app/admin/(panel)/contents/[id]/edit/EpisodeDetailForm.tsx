'use client'

import { EPISODE_PROGRAM_LABEL } from '@/modules/content/domain/episodeLabels'
import { useActionState } from 'react'

import {
  episodeProgramSchema,
  episodeProviderSchema,
  episodeKindSchema,
  type Episode,
} from '@/modules/content/domain/episodeSchema'

import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput, AdminSelect } from '@/components/admin/AdminControls'
import { AdminField } from '@/components/admin/AdminField'
import {
  AdminForm,
  AdminFormActions,
  AdminFormGrid,
} from '@/components/admin/AdminForm'
import { AdminMessage } from '@/components/admin/AdminMessage'

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
    <AdminForm action={formAction}>
      <input type="hidden" name="contentId" value={contentId} />

      <AdminFormGrid>
        <AdminField
          label="Programa"
          htmlFor="program"
          error={state.fieldErrors?.program?.[0]}
        >
          <AdminSelect
            id="program"
            name="program"
            defaultValue={episode?.program ?? episodeProgramSchema.options[0]}
          >
            {episodeProgramSchema.options.map((option) => (
              <option key={option} value={option}>
                {EPISODE_PROGRAM_LABEL[option]}
              </option>
            ))}
          </AdminSelect>
        </AdminField>

        <AdminField
          label="Tipo de episodio"
          htmlFor="episodeKind"
          error={state.fieldErrors?.episodeKind?.[0]}
        >
          <AdminSelect
            id="episodeKind"
            name="episodeKind"
            defaultValue={episode?.episodeKind ?? episodeKindSchema.options[0]}
          >
            {episodeKindSchema.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </AdminSelect>
        </AdminField>

        <AdminField
          label="Proveedor"
          htmlFor="provider"
          error={state.fieldErrors?.provider?.[0]}
        >
          <AdminSelect
            id="provider"
            name="provider"
            defaultValue={episode?.provider ?? episodeProviderSchema.options[0]}
          >
            {episodeProviderSchema.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </AdminSelect>
        </AdminField>

        <AdminField
          label="ID del embed (el propio proveedor, no una URL completa)"
          htmlFor="embedId"
          error={state.fieldErrors?.embedId?.[0]}
        >
          <AdminInput
            id="embedId"
            name="embedId"
            type="text"
            defaultValue={episode?.embedId ?? ''}
          />
        </AdminField>
      </AdminFormGrid>

      {state.formError && (
        <AdminMessage kind="error">{state.formError}</AdminMessage>
      )}

      {state.success && (
        <AdminMessage kind="success">
          Datos del episodio guardados correctamente.
        </AdminMessage>
      )}

      <AdminFormActions>
        <AdminButton type="submit" variant="primary" disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar datos del episodio'}
        </AdminButton>
      </AdminFormActions>
    </AdminForm>
  )
}
