'use client'

import { useActionState, useState } from 'react'

import type { PinListItem } from '@/modules/pin/domain/pinRepository'

import {
  deleteAllPinsAction,
  deletePinAction,
  updatePinAction,
  type PinFormState,
} from './pinActions'

import PinMediaManager from './PinMediaManager'
import { MAX_PINS_PER_CONTENT } from '@/modules/pin/domain/pinLimits'
import { hasDerivedPinLabel } from '@/modules/pin/domain/derivedPinLabel'

type Props = {
  contentId: string
  contentType: string
  pins: PinListItem[]
}

const initialState: PinFormState = {}

function EditPinForm({
  pin,
  contentId,
  derivedLabel,
}: {
  pin: PinListItem
  contentId: string
  derivedLabel: boolean
}) {
  const [state, formAction, pending] = useActionState(
    updatePinAction.bind(null, pin.id, contentId),
    initialState,
  )

  return (
    <form action={formAction}>
      <label htmlFor={`ratio-${pin.id}`}>Ratio</label>
      <select
        id={`ratio-${pin.id}`}
        name="ratio"
        defaultValue={pin.ratio}
        required
      >
        <option value="1:1">1:1</option>
        <option value="4:3">4:3</option>
        <option value="4:5">4:5</option>
        <option value="3:4">3:4</option>
        <option value="2:3">2:3</option>
        <option value="9:16">9:16</option>
        <option value="16:9">16:9</option>
      </select>

      {derivedLabel ? (
        <>
          <input name="label" type="hidden" value="" />
          <p>
            Texto del feed automático: título + cliente (Case), tipo de episodio
            (Episode) o «Insights by Greener» (Insight).
          </p>
        </>
      ) : (
        <>
          <label htmlFor={`label-${pin.id}`}>Frase gancho</label>
          <input
            id={`label-${pin.id}`}
            name="label"
            type="text"
            defaultValue={pin.label ?? ''}
          />
        </>
      )}

      <label htmlFor={`language-${pin.id}`}>Idioma</label>
      <select
        id={`language-${pin.id}`}
        name="language"
        defaultValue={pin.language}
        required
      >
        <option value="es">Español</option>
        <option value="en">English</option>
        <option value="ca">Català</option>
      </select>

      <label htmlFor={`autoplay-${pin.id}`}>Autoplay</label>
      <select
        id={`autoplay-${pin.id}`}
        name="autoplayMode"
        defaultValue={pin.autoplayMode ?? ''}
      >
        <option value="">Sin autoplay</option>
        <option value="viewport">Al entrar en viewport</option>
        <option value="hover">Al hacer hover</option>
      </select>

      <label htmlFor={`alt-${pin.id}`}>Alt</label>
      <input
        id={`alt-${pin.id}`}
        name="alt"
        type="text"
        defaultValue={pin.alt}
        required
      />

      {state.formError && <p>{state.formError}</p>}
      {state.success && <p>Guardado.</p>}

      <button type="submit" disabled={pending}>
        {pending ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  )
}

function DeletePinButton({
  pin,
  contentId,
}: {
  pin: PinListItem
  contentId: string
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (
      !window.confirm(
        `¿Borrar el pin "${pin.label ?? pin.id}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return
    }

    setPending(true)
    setError(null)

    const result = await deletePinAction(pin.id, contentId)

    if (result.formError) {
      setError(result.formError)
      setPending(false)
      return
    }

    if (result.warning) {
      setError(result.warning)
      setPending(false)
      return
    }

    window.location.reload()
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={pending}>
        {pending ? 'Borrando...' : 'Borrar pin'}
      </button>

      {error && <p>{error}</p>}
    </div>
  )
}

function DeleteAllPinsButton({
  contentId,
  count,
}: {
  contentId: string
  count: number
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (
      !window.confirm(
        `¿Borrar los ${count} pines de este contenido? Se borrarán también sus archivos y el contenido dejará de aparecer en el feed hasta que subas pines nuevos. Esta acción no se puede deshacer.`,
      )
    ) {
      return
    }

    setPending(true)
    setError(null)

    const result = await deleteAllPinsAction(contentId)

    if (result.formError) {
      setError(result.formError)
      setPending(false)
      return
    }

    if (result.warning) {
      setError(result.warning)
      setPending(false)
      return
    }

    window.location.reload()
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={pending}>
        {pending ? 'Borrando...' : `Borrar todos los pines (${count})`}
      </button>

      {error && <p>{error}</p>}
    </div>
  )
}

export default function PinList({ contentId, contentType, pins }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const derivedLabel = hasDerivedPinLabel(contentType)

  return (
    <div>
      <p>
        {pins.length} / {MAX_PINS_PER_CONTENT} pines
        {pins.length >= MAX_PINS_PER_CONTENT
          ? ' — máximo alcanzado, no se pueden crear más.'
          : '.'}
      </p>

      <table>
        <thead>
          <tr>
            <th>Rótulo</th>
            <th>Ratio</th>
            <th>Medio</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {pins.map((pin) => (
            <tr key={pin.id}>
              <td>
                {derivedLabel
                  ? 'Automático: título + cliente / tipo de episodio / «Insights by Greener»'
                  : (pin.label ?? '—')}
              </td>
              <td>{pin.ratio}</td>
              <td>
                {pin.media.length === 0
                  ? 'Sin medio'
                  : pin.media[0].kind === 'video'
                    ? 'Vídeo'
                    : 'Imagen'}
              </td>
              <td>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(expandedId === pin.id ? null : pin.id)
                  }
                >
                  {expandedId === pin.id ? 'Cerrar' : 'Editar'}
                </button>

                <DeletePinButton pin={pin} contentId={contentId} />
              </td>
            </tr>
          ))}

          {pins.length === 0 && (
            <tr>
              <td colSpan={4}>Todavía no hay pines para este contenido.</td>
            </tr>
          )}
        </tbody>
      </table>

      {pins.length > 0 && (
        <DeleteAllPinsButton contentId={contentId} count={pins.length} />
      )}

      {pins
        .filter((pin) => pin.id === expandedId)
        .map((pin) => (
          <div key={pin.id}>
            <EditPinForm
              pin={pin}
              contentId={contentId}
              derivedLabel={derivedLabel}
            />

            <PinMediaManager
              pinId={pin.id}
              contentType={contentType}
              pinRatio={pin.ratio}
              media={pin.media}
            />
          </div>
        ))}
    </div>
  )
}
