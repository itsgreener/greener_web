'use client'

import { useActionState } from 'react'

import { createBlockAction, type CreateBlockActionState } from './blockActions'

type Props = {
  contentId: string
  nextSortOrder: number
}

const initialState: CreateBlockActionState = {}

export default function CreateContentBlockForm({
  contentId,
  nextSortOrder,
}: Props) {
  const [state, formAction, pending] = useActionState(
    createBlockAction,
    initialState,
  )

  return (
    <form action={formAction}>
      <input type="hidden" name="contentId" value={contentId} />

      <h3>Añadir bloque</h3>

      <div>
        <label htmlFor="block-type">Tipo</label>

        <select id="block-type" name="type" defaultValue="rich_text">
          <option value="rich_text">Rich text</option>

          <option value="image">Image</option>

          <option value="carousel">Carousel</option>

          <option value="video">Video</option>

          <option value="quote">Quote</option>

          <option value="links_credits">Links / Credits</option>
        </select>
      </div>

      <div>
        <label htmlFor="block-sort-order">Orden</label>

        <input
          id="block-sort-order"
          name="sortOrder"
          type="number"
          min="0"
          step="1"
          defaultValue={nextSortOrder}
          required
        />
      </div>

      <div>
        <label htmlFor="block-config">Config (JSON)</label>

        <textarea id="block-config" name="config" rows={5} defaultValue="{}" />
      </div>

      {state.fieldErrors?.config?.[0] && <p>{state.fieldErrors.config[0]}</p>}

      {state.formError && <p>{state.formError}</p>}

      {state.success && <p>Bloque creado correctamente.</p>}

      <button type="submit" disabled={pending}>
        {pending ? 'Creando...' : 'Añadir bloque'}
      </button>
    </form>
  )
}
