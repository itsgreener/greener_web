'use client'

import { useActionState } from 'react'

import {
  createContentAction,
} from '../actions'

const initialState = {
  fieldErrors: {},
  formError: undefined,
}

export default function NewContentForm() {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    createContentAction,
    initialState
  )

  return (
    <form action={formAction}>

      <div>
        <label htmlFor="type">
          Tipo
        </label>

        <select
          id="type"
          name="type"
          defaultValue="case"
        >
          <option value="case">Case</option>
          <option value="insight">Insight</option>
          <option value="tool">Tool</option>
          <option value="episode">Episode</option>
          <option value="page">Page</option>
        </select>
      </div>

      <div>
        <label htmlFor="title">
          Título
        </label>

        <input
          id="title"
          name="title"
          required
        />

        {state.fieldErrors?.title?.[0] && (
          <p>
            {state.fieldErrors.title[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="slug">
          Slug
        </label>

        <input
          id="slug"
          name="slug"
          placeholder="mi-primer-caso"
          required
        />

        {state.fieldErrors?.slug?.[0] && (
          <p>
            {state.fieldErrors.slug[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="defaultLocale">
          Idioma
        </label>

        <select
          id="defaultLocale"
          name="defaultLocale"
          defaultValue="es"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="ca">Català</option>
        </select>
      </div>

      {state.formError && (
        <p>{state.formError}</p>
      )}

      <button
        type="submit"
        disabled={pending}
      >
        {pending
          ? 'Creando...'
          : 'Crear borrador'}
      </button>

    </form>
  )
}