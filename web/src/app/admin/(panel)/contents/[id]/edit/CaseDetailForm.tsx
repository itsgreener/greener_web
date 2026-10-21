'use client'

import { useActionState } from 'react'

import type { CaseDetail } from '@/modules/content/domain/caseDetailSchema'

import { TEXT_LIMITS } from '@/modules/content/domain/textLimits'

import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput, AdminSelect } from '@/components/admin/AdminControls'
import { AdminField } from '@/components/admin/AdminField'
import {
  AdminForm,
  AdminFormActions,
  AdminFormGrid,
} from '@/components/admin/AdminForm'
import { AdminMessage } from '@/components/admin/AdminMessage'
import { CharCounter } from '@/components/admin/CharCounter'

import { useCharCount } from '@/components/admin/useCharCount'

import { saveCaseDetailAction, type CaseDetailActionState } from './caseActions'

type Props = {
  contentId: string
  caseDetail: CaseDetail | null
}

const initialState: CaseDetailActionState = {}

export default function CaseDetailForm({ contentId, caseDetail }: Props) {
  const [state, formAction, pending] = useActionState(
    saveCaseDetailAction,
    initialState,
  )

  const client = useCharCount(caseDetail?.client ?? '')

  return (
    <AdminForm action={formAction}>
      <input type="hidden" name="contentId" value={contentId} />

      <AdminFormGrid>
        <AdminField
          label="Force"
          htmlFor="force"
          error={state.fieldErrors?.force?.[0]}
        >
          <AdminSelect
            id="force"
            name="force"
            defaultValue={caseDetail?.force ?? 1}
          >
            <option value="1">1</option>

            <option value="2">2</option>

            <option value="3">3</option>

            <option value="4">4</option>

            <option value="5">5</option>
          </AdminSelect>
        </AdminField>

        <AdminField
          label="Cliente"
          htmlFor="client"
          aside={
            <CharCounter length={client.length} max={TEXT_LIMITS.client} />
          }
          error={state.fieldErrors?.client?.[0]}
        >
          <AdminInput
            id="client"
            name="client"
            type="text"
            defaultValue={caseDetail?.client ?? ''}
            onChange={client.onChange}
          />
        </AdminField>
      </AdminFormGrid>

      {state.formError && (
        <AdminMessage kind="error">{state.formError}</AdminMessage>
      )}

      {state.success && (
        <AdminMessage kind="success">
          Datos del Case guardados correctamente.
        </AdminMessage>
      )}

      <AdminFormActions>
        <AdminButton type="submit" variant="primary" disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar datos del Case'}
        </AdminButton>
      </AdminFormActions>
    </AdminForm>
  )
}
