'use client'

import { useActionState } from 'react'

import type { PinListItem } from '@/modules/pin/domain/pinRepository'

import {
  updatePinAction,
  type PinFormState,
} from '@/app/admin/(panel)/contents/[id]/edit/pinActions'

const initialState: PinFormState = {}

export function EditPinForm({
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

      {/* El autoplay solo existe para vídeos: en una imagen (o un pin aún sin
          medio) no se ofrece, y al guardar queda sin modo (null). */}
      {pin.media?.kind === 'video' && (
        <>
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
        </>
      )}

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
