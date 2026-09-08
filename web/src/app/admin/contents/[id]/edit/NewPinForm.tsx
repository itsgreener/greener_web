'use client'

import { useActionState } from 'react'

import { createPinAction, type PinFormState } from './pinActions'

type Props = {
  contentId: string
}

const initialState: PinFormState = {}

export default function NewPinForm({ contentId }: Props) {
  const [state, formAction, pending] = useActionState(
    createPinAction.bind(null, contentId),
    initialState,
  )

  return (
    <form action={formAction}>
      <h3>Nuevo pin</h3>

      <label htmlFor="pin-type">Tipo</label>
      <select id="pin-type" name="type" required>
        <option value="fixed">Imagen fija</option>
        <option value="animated">Animación</option>
        <option value="carousel">Carrusel</option>
      </select>
      {state.fieldErrors?.type?.[0] && <p>{state.fieldErrors.type[0]}</p>}

      <label htmlFor="pin-ratio">Ratio</label>
      <select id="pin-ratio" name="ratio" required>
        <option value="1:1">1:1</option>
        <option value="4:5">4:5</option>
        <option value="3:4">3:4</option>
        <option value="2:3">2:3</option>
        <option value="9:16">9:16</option>
        <option value="16:9">16:9</option>
      </select>

      <label htmlFor="pin-label">Rótulo</label>
      <input id="pin-label" name="label" type="text" required />
      {state.fieldErrors?.label?.[0] && <p>{state.fieldErrors.label[0]}</p>}

      <label htmlFor="pin-cta">CTA (opcional)</label>
      <input id="pin-cta" name="cta" type="text" />

      <label htmlFor="pin-language">Idioma</label>
      <select id="pin-language" name="language" required>
        <option value="es">Español</option>
        <option value="en">English</option>
        <option value="ca">Català</option>
      </select>

      <label htmlFor="pin-autoplay">Autoplay (opcional, solo carrusel)</label>
      <select id="pin-autoplay" name="autoplayMode" defaultValue="">
        <option value="">Sin autoplay</option>
        <option value="viewport">Al entrar en viewport</option>
        <option value="hover">Al hacer hover</option>
      </select>

      <label htmlFor="pin-speed">Velocidad autoplay en ms (opcional)</label>
      <input id="pin-speed" name="speedMs" type="number" min={1} />

      <label htmlFor="pin-queue-order">Orden en cola</label>
      <input
        id="pin-queue-order"
        name="queueOrder"
        type="number"
        min={0}
        defaultValue={0}
        required
      />
      {state.fieldErrors?.queueOrder?.[0] && (
        <p>{state.fieldErrors.queueOrder[0]}</p>
      )}

      <label htmlFor="pin-alt">Alt</label>
      <input id="pin-alt" name="alt" type="text" required />
      {state.fieldErrors?.alt?.[0] && <p>{state.fieldErrors.alt[0]}</p>}

      {state.formError && <p>{state.formError}</p>}
      {state.success && <p>Pin creado. Ya puedes subir su medio abajo.</p>}

      <button type="submit" disabled={pending}>
        {pending ? 'Creando...' : 'Crear pin'}
      </button>
    </form>
  )
}
