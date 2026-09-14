'use client'

import { useActionState } from 'react'

import type { CaseDetail } from '@/modules/content/domain/caseDetailSchema'

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
    <form action={formAction}>
      <input type="hidden" name="contentId" value={contentId} />

      <div>
        <label htmlFor="force">Force</label>

        <select id="force" name="force" defaultValue={caseDetail?.force ?? 1}>
          <option value="1">1</option>

          <option value="2">2</option>

          <option value="3">3</option>

          <option value="4">4</option>

          <option value="5">5</option>
        </select>

        {state.fieldErrors?.force?.[0] && <p>{state.fieldErrors.force[0]}</p>}
      </div>

      <div>
        <label htmlFor="client">Cliente</label>

        <input
          id="client"
          name="client"
          type="text"
          defaultValue={caseDetail?.client ?? ''}
        />

        {state.fieldErrors?.client?.[0] && <p>{state.fieldErrors.client[0]}</p>}
      </div>

      {state.formError && <p>{state.formError}</p>}

      {state.success && <p>Datos del Case guardados correctamente.</p>}

      <button type="submit" disabled={pending}>
        {pending ? 'Guardando...' : 'Guardar datos del Case'}
      </button>
    </form>
  )
}
