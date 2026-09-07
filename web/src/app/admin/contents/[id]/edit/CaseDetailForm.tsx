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
        <label htmlFor="templateVariant">Plantilla</label>

        <select
          id="templateVariant"
          name="templateVariant"
          defaultValue={caseDetail?.templateVariant ?? 'A'}
        >
          <option value="A">A</option>

          <option value="B">B</option>

          <option value="C">C</option>
        </select>

        {state.fieldErrors?.templateVariant?.[0] && (
          <p>{state.fieldErrors.templateVariant[0]}</p>
        )}
      </div>

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

      <div>
        <label htmlFor="year">Año</label>

        <input
          id="year"
          name="year"
          type="number"
          step="1"
          defaultValue={caseDetail?.year ?? ''}
        />

        {state.fieldErrors?.year?.[0] && <p>{state.fieldErrors.year[0]}</p>}
      </div>

      <div>
        <label htmlFor="sector">Sector</label>

        <input
          id="sector"
          name="sector"
          type="text"
          defaultValue={caseDetail?.sector ?? ''}
        />

        {state.fieldErrors?.sector?.[0] && <p>{state.fieldErrors.sector[0]}</p>}
      </div>

      <div>
        <label htmlFor="services">Servicios</label>

        <textarea
          id="services"
          name="services"
          defaultValue={caseDetail?.services ?? ''}
        />

        {state.fieldErrors?.services?.[0] && (
          <p>{state.fieldErrors.services[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="credits">Créditos (JSON)</label>

        <textarea
          id="credits"
          name="credits"
          rows={6}
          defaultValue={JSON.stringify(caseDetail?.credits ?? [], null, 2)}
        />

        <p>Debe ser un array JSON. Si no hay créditos, utiliza [].</p>

        {state.fieldErrors?.credits?.[0] && (
          <p>{state.fieldErrors.credits[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="links">Links (JSON)</label>

        <textarea
          id="links"
          name="links"
          rows={6}
          defaultValue={JSON.stringify(caseDetail?.links ?? [], null, 2)}
        />

        <p>Debe ser un array JSON. Si no hay links, utiliza [].</p>

        {state.fieldErrors?.links?.[0] && <p>{state.fieldErrors.links[0]}</p>}
      </div>

      {state.formError && <p>{state.formError}</p>}

      {state.success && <p>Datos del Case guardados correctamente.</p>}

      <button type="submit" disabled={pending}>
        {pending ? 'Guardando...' : 'Guardar datos del Case'}
      </button>
    </form>
  )
}
