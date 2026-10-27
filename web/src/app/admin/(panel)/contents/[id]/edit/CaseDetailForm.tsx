'use client'

import { useActionState } from 'react'

import type { CaseDetail } from '@/modules/content/domain/caseDetailSchema'

import { TEXT_LIMITS } from '@/modules/content/domain/textLimits'

import { AdminSelect } from '@/components/admin/AdminControls'
import { AdminField } from '@/components/admin/AdminField'
import { AdminCountedField } from '@/components/admin/AdminCountedField'
import {
  AdminForm,
  AdminFormFooter,
  AdminFormGrid,
} from '@/components/admin/AdminForm'
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

        <AdminCountedField
          id="client"
          name="client"
          label="Cliente"
          max={TEXT_LIMITS.client}
          defaultValue={caseDetail?.client ?? ''}
          error={state.fieldErrors?.client?.[0]}
        />
      </AdminFormGrid>

      <AdminFormFooter
        state={state}
        pending={pending}
        label="Guardar datos del Case"
        successMessage="Datos del Case guardados correctamente."
      />
    </AdminForm>
  )
}
