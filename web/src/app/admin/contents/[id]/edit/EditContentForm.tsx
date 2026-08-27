'use client'

import {
  useActionState,
} from 'react'

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

function getContentTypeLabel(
  type: ContentDetail['type']
) {
  switch (type) {
    case 'case':
      return 'Case'

    case 'insight':
      return 'Insight'

    case 'tool':
      return 'Tool'

    case 'episode':
      return 'Episode'

    case 'page':
      return 'Page'
  }
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
        <strong>
          Tipo:
        </strong>{' '}
        {
          getContentTypeLabel(
            content.type
          )
        }
      </div>

      <div>
        <label htmlFor="slug">
          Slug
        </label>

        <input
          id="slug"
          name="slug"
          type="text"
          defaultValue={
            content.slug
          }
          required
        />

        {state
          .fieldErrors
          ?.slug?.[0] && (
          <p>
            {
              state
                .fieldErrors
                .slug[0]
            }
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="defaultLocale"
        >
          Idioma principal
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

        {state
          .fieldErrors
          ?.defaultLocale?.[0] && (
          <p>
            {
              state
                .fieldErrors
                .defaultLocale[0]
            }
          </p>
        )}
      </div>

      <div>
        <strong>
          Estado:
        </strong>{' '}
        {content.status}
      </div>

      {state.formError && (
        <p>
          {state.formError}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
      >
        {pending
          ? 'Guardando...'
          : 'Guardar datos generales'}
      </button>

    </form>
  )
}