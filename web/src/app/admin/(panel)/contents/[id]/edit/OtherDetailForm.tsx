'use client'

import { useActionState, useState } from 'react'

import OtherOccupationNotice from '@/app/admin/(panel)/contents/OtherOccupationNotice'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput } from '@/components/admin/AdminControls'
import { AdminField, AdminReadonlyField } from '@/components/admin/AdminField'
import {
  AdminForm,
  AdminFormActions,
  AdminFormGrid,
} from '@/components/admin/AdminForm'
import { AdminMessage } from '@/components/admin/AdminMessage'

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
    <AdminForm action={formAction}>
      <input type="hidden" name="contentId" value={other.contentId} />

      <AdminFormGrid>
        <AdminReadonlyField label="Tipo de Other">
          <strong>{otherKindLabel(other.kind)}</strong>
        </AdminReadonlyField>

        <AdminField
          label={`Frecuencia (una aparición cada N pines; mínimo ${OTHER_MIN_FREQUENCY})`}
          htmlFor="frequency"
          help="Las primeras apariciones se reparten desde el pin 10 y se espacian 8-15 pines entre contenidos; después, cada N."
          error={state.fieldErrors?.frequency?.[0]}
        >
          <AdminInput
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
        </AdminField>
      </AdminFormGrid>

      <OtherOccupationNotice
        percent={occupation}
        scope="con este contenido publicado"
      />

      {state.formError && (
        <AdminMessage kind="error">{state.formError}</AdminMessage>
      )}

      {state.success && (
        <AdminMessage kind="success">
          Frecuencia guardada correctamente.
        </AdminMessage>
      )}

      <AdminFormActions>
        <AdminButton type="submit" variant="primary" disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar frecuencia'}
        </AdminButton>
      </AdminFormActions>
    </AdminForm>
  )
}
