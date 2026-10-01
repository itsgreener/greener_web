'use client'

import { useActionState, useState } from 'react'

import { createContentAction, type CreateContentActionState } from '../actions'

const initialState: CreateContentActionState = {}

const contentTypes = [
  {
    value: 'case',
    label: 'Case',
    description:
      'Proyecto o caso de trabajo con ficha, medios y contenido editorial.',
    symbol: 'C',
  },
  {
    value: 'insight',
    label: 'Insight',
    description:
      'Contenido editorial interactivo servido mediante paquete HTML.',
    symbol: 'I',
  },
  {
    value: 'tool',
    label: 'Tool',
    description: 'Herramienta interactiva ejecutada desde su propia página.',
    symbol: 'T',
  },
  {
    value: 'episode',
    label: 'Episode',
    description: 'Episodio de Channel con vídeo, podcast y datos del programa.',
    symbol: 'E',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Contenido libre que no pertenece a los formatos principales.',
    symbol: 'O',
  },
] as const

type ContentTypeValue = (typeof contentTypes)[number]['value']

export default function NewContentForm() {
  const [state, formAction, pending] = useActionState(
    createContentAction,
    initialState,
  )

  const [selectedType, setSelectedType] = useState<ContentTypeValue>('case')

  return (
    <form action={formAction} className="admin-form admin-new-content-form">
      <div className="admin-new-section">
        <div className="admin-new-section-heading">
          <span className="admin-new-step">1</span>

          <div>
            <h3>Tipo de contenido</h3>

            <p>
              Determina qué opciones estarán disponibles después en el editor.
            </p>
          </div>
        </div>

        <div className="admin-content-type-grid">
          {contentTypes.map((type) => {
            const selected = selectedType === type.value

            return (
              <label
                key={type.value}
                className={
                  selected
                    ? 'admin-content-type-card admin-content-type-card-selected'
                    : 'admin-content-type-card'
                }
              >
                <input
                  type="radio"
                  name="type"
                  value={type.value}
                  checked={selected}
                  onChange={() => setSelectedType(type.value)}
                />

                <span className="admin-content-type-symbol">{type.symbol}</span>

                <span className="admin-content-type-copy">
                  <strong>{type.label}</strong>

                  <small>{type.description}</small>
                </span>

                <span className="admin-content-type-check" aria-hidden="true">
                  {selected ? '✓' : ''}
                </span>
              </label>
            )
          })}
        </div>

        {state.fieldErrors?.type?.[0] && (
          <p className="admin-field-error">{state.fieldErrors.type[0]}</p>
        )}
      </div>

      <div className="admin-new-section">
        <div className="admin-new-section-heading">
          <span className="admin-new-step">2</span>

          <div>
            <h3>Datos básicos</h3>

            <p>
              Define cómo se identificará el contenido dentro del panel y en la
              web.
            </p>
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="title">Título</label>

          <input
            id="title"
            name="title"
            type="text"
            placeholder="Ej. Nutrivo Group — Biotecnología"
            required
            autoFocus
          />

          <p className="admin-field-help">
            Podrás modificarlo después y añadir traducciones desde el editor.
          </p>

          {state.fieldErrors?.title?.[0] && (
            <p className="admin-field-error">{state.fieldErrors.title[0]}</p>
          )}
        </div>

        <div className="admin-form-grid admin-form-grid-2">
          <div className="admin-field">
            <label htmlFor="slug">Slug</label>

            <div className="admin-slug-input">
              <span>/</span>

              <input
                id="slug"
                name="slug"
                type="text"
                placeholder="mi-primer-caso"
                required
              />
            </div>

            <p className="admin-field-help">
              Forma parte de la URL pública. Utiliza minúsculas y guiones.
            </p>

            {state.fieldErrors?.slug?.[0] && (
              <p className="admin-field-error">{state.fieldErrors.slug[0]}</p>
            )}
          </div>

          <div className="admin-field">
            <label htmlFor="defaultLocale">Idioma principal</label>

            <select id="defaultLocale" name="defaultLocale" defaultValue="es">
              <option value="es">Español</option>

              <option value="en">English</option>

              <option value="ca">Català</option>
            </select>

            <p className="admin-field-help">
              Será el idioma principal del contenido.
            </p>

            {state.fieldErrors?.defaultLocale?.[0] && (
              <p className="admin-field-error">
                {state.fieldErrors.defaultLocale[0]}
              </p>
            )}
          </div>
        </div>
      </div>

      {state.formError && <p className="admin-form-error">{state.formError}</p>}

      <div className="admin-new-content-footer">
        <div className="admin-new-content-note">
          <span aria-hidden="true">i</span>

          <p>
            <strong>Se creará como borrador.</strong> Después podrás añadir el
            resto de información antes de publicarlo.
          </p>
        </div>

        <button
          type="submit"
          className="admin-button admin-button-primary admin-create-content-button"
          disabled={pending}
        >
          {pending ? 'Creando borrador...' : 'Crear borrador →'}
        </button>
      </div>
    </form>
  )
}
