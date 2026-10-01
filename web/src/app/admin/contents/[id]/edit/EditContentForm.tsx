'use client'

import { useActionState } from 'react'

import type { ContentDetail } from '@/modules/content/domain/contentRepository'

import { updateContentAction } from './actions'

const initialState = {
  fieldErrors: {},
  formError: undefined,
}

type Props = {
  content: ContentDetail
}

function getContentTypeLabel(type: ContentDetail['type']) {
  switch (type) {
    case 'case':
      return 'Case'

    case 'insight':
      return 'Insight'

    case 'tool':
      return 'Tool'

    case 'episode':
      return 'Episode'

    case 'other':
      return 'Other'
  }
}

export default function EditContentForm({ content }: Props) {
  const [state, formAction, pending] = useActionState(
    updateContentAction,
    initialState,
  )

  return (
    <form action={formAction} className="admin-form">
      <input type="hidden" name="id" value={content.id} />

      <div className="admin-form-grid admin-form-grid-2">
        <div className="admin-readonly-field">
          <span className="admin-field-label">Tipo</span>

          <strong>{getContentTypeLabel(content.type)}</strong>
        </div>

        <div className="admin-readonly-field">
          <span className="admin-field-label">Estado</span>

          <span className={`admin-status admin-status-${content.status}`}>
            {content.status}
          </span>
        </div>
      </div>

      <div className="admin-form-grid admin-form-grid-2">
        <div className="admin-field">
          <label htmlFor="slug">Slug</label>

          <input
            id="slug"
            name="slug"
            type="text"
            defaultValue={content.slug}
            required
          />

          <p className="admin-field-help">
            Se utiliza para construir la URL pública.
          </p>

          {state.fieldErrors?.slug?.[0] && (
            <p className="admin-field-error">{state.fieldErrors.slug[0]}</p>
          )}
        </div>

        <div className="admin-field">
          <label htmlFor="defaultLocale">Idioma principal</label>

          <select
            id="defaultLocale"
            name="defaultLocale"
            defaultValue={content.defaultLocale}
          >
            <option value="es">Español</option>

            <option value="en">English</option>

            <option value="ca">Català</option>
          </select>

          <p className="admin-field-help">
            Será el idioma utilizado en la URL canónica del contenido.
          </p>

          {state.fieldErrors?.defaultLocale?.[0] && (
            <p className="admin-field-error">
              {state.fieldErrors.defaultLocale[0]}
            </p>
          )}
        </div>
      </div>

      {state.formError && <p className="admin-form-error">{state.formError}</p>}

      <div className="admin-form-actions">
        <button
          className="admin-button admin-button-primary"
          type="submit"
          disabled={pending}
        >
          {pending ? 'Guardando...' : 'Guardar datos generales'}
        </button>
      </div>
    </form>
  )
}
