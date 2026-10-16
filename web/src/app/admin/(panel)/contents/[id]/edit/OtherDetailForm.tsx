'use client'

import { useActionState, useState } from 'react'

import OtherOccupationNotice from '@/app/admin/(panel)/contents/OtherOccupationNotice'

import {
  OTHER_MIN_FREQUENCY,
  estimateOtherOccupation,
  otherKindLabel,
  type OtherDetail,
} from '@/modules/content/domain/otherSchema'

import {
  saveOtherFrequencyAction,
  type OtherFrequencyActionState,
} from './otherActions'

type Props = {
  other: OtherDetail
  /** Frecuencias de los demás Other publicados (sin este). */
  otherFrequencies: readonly number[]
}

const initialState: OtherFrequencyActionState = {}

export default function OtherDetailForm({ other, otherFrequencies }: Props) {
  const [state, formAction, pending] = useActionState(
    saveOtherFrequencyAction,
    initialState,
  )

  const [typed, setTyped] = useState(String(other.frequency))

  // Estimación con el valor que se está escribiendo: se ve el efecto antes de
  // guardar. Un valor vacío o roto no cuenta.
  const occupation = estimateOtherOccupation([
    ...otherFrequencies,
    Number(typed),
  ])

  return (
    <form action={formAction} className="admin-form">
      <input type="hidden" name="contentId" value={other.contentId} />

      <div className="admin-form-grid admin-form-grid-2">
        <div className="admin-readonly-field">
          <span className="admin-field-label">Tipo de Other</span>

          <strong>{otherKindLabel(other.kind)}</strong>
        </div>

        <div className="admin-field">
          <label htmlFor="frequency">
            Frecuencia (una aparición cada N pines; mínimo {OTHER_MIN_FREQUENCY}
            )
          </label>

          <input
            id="frequency"
            name="frequency"
            type="number"
            inputMode="numeric"
            min={OTHER_MIN_FREQUENCY}
            step={1}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            required
          />

          <p className="admin-field-help">
            Las primeras apariciones se reparten desde el pin 10 y se espacian
            8-15 pines entre contenidos; después, cada N.
          </p>

          {state.fieldErrors?.frequency?.[0] && (
            <p className="admin-field-error">
              {state.fieldErrors.frequency[0]}
            </p>
          )}
        </div>
      </div>

      <OtherOccupationNotice
        percent={occupation}
        scope="con este contenido publicado"
      />

      {state.formError && <p className="admin-form-error">{state.formError}</p>}

      {state.success && (
        <p className="admin-form-success">Frecuencia guardada correctamente.</p>
      )}

      <div className="admin-form-actions">
        <button
          className="admin-button admin-button-primary"
          type="submit"
          disabled={pending}
        >
          {pending ? 'Guardando...' : 'Guardar frecuencia'}
        </button>
      </div>
    </form>
  )
}
