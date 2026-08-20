'use client'

import { useActionState } from 'react'

import type {
  ContentDetail,
} from '@/modules/content/domain/contentRepository'

import {
  updateContentAction,
} from './actions'

const initialState = {
  fieldErrors: {},
  formError: undefined,
}

type Props = {
  content: ContentDetail
}

export default function EditContentForm({
  content,
}: Props) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    updateContentAction,
    initialState
  )

  return (
    <form action={formAction}>

      <input
        type="hidden"
        name="id"
        value={content.id}
      />

      <div>
        <label htmlFor="type">
          Tipo
        </label>

        <select
          id="type"
          name="type"
          defaultValue={content.type}
        >
          <option value="case">
            Case
          </option>

          <option value="insight">
            Insight
          </option>

          <option value="tool">
            Tool
          </option>

          <option value="episode">
            Episode
          </option>

          <option value="page">
            Page
          </option>
        </select>

        {state.fieldErrors?.type?.[0] && (
          <p>
            {state.fieldErrors.type[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="title">
          Título
        </label>

        <input
          id="title"
          name="title"
          type="text"
          defaultValue={content.title}
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
          type="text"
          defaultValue={content.slug}
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
          defaultValue={
            content.defaultLocale
          }
        >
          <option value="es">
            Español
          </option>

          <option value="en">
            English
          </option>

          <option value="ca">
            Català
          </option>
        </select>

        {state.fieldErrors
          ?.defaultLocale?.[0] && (
          <p>
            {
              state.fieldErrors
                .defaultLocale[0]
            }
          </p>
        )}
      </div>

      <div>
        <strong>Estado:</strong>{' '}
        {content.status}
      </div>

      {state.formError && (
        <p>{state.formError}</p>
      )}

      <button
        type="submit"
        disabled={pending}
      >
        {pending
          ? 'Guardando...'
          : 'Guardar cambios'}
      </button>

    </form>
  )
}