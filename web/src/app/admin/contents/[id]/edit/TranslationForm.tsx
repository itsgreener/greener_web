'use client'

import { useActionState } from 'react'

import type { Locale } from '@/modules/content/domain/contentSchema'

import type { ContentTranslation } from '@/modules/content/domain/contentTranslationSchema'

import { TEXT_LIMITS } from '@/modules/content/domain/textLimits'

import { CharCounter } from '@/components/admin/CharCounter'

import { useCharCount } from '@/components/admin/useCharCount'

import {
  saveTranslationAction,
  type TranslationActionState,
} from './translationActions'

type Props = {
  contentId: string
  locale: Locale
  translation: ContentTranslation | null
  showHighlightAndBody: boolean
}

const initialState: TranslationActionState = {}

function getLocaleLabel(locale: Locale) {
  switch (locale) {
    case 'es':
      return 'Español'

    case 'en':
      return 'English'

    case 'ca':
      return 'Català'
  }
}

export default function TranslationForm({
  contentId,
  locale,
  translation,
  showHighlightAndBody,
}: Props) {
  const [state, formAction, pending] = useActionState(
    saveTranslationAction,
    initialState,
  )

  const title = useCharCount(translation?.title ?? '')

  const seoTitle = useCharCount(translation?.seoTitle ?? '')

  const seoDescription = useCharCount(translation?.seoDescription ?? '')

  const summary = useCharCount(translation?.summary ?? '')

  const highlight = useCharCount(translation?.highlight ?? '')

  const body = useCharCount(translation?.body ?? '')

  return (
    <form action={formAction} className="admin-form admin-translation-form">
      <input type="hidden" name="contentId" value={contentId} />

      <input type="hidden" name="locale" value={locale} />

      <div className="admin-translation-heading">
        <div>
          <h3>{getLocaleLabel(locale)}</h3>

          <p>Contenido y metadatos para esta versión lingüística.</p>
        </div>

        <span className="admin-locale-badge">{locale.toUpperCase()}</span>
      </div>

      <div className="admin-field">
        <div className="admin-field-heading">
          <label htmlFor={`title-${locale}`}>Título</label>

          <CharCounter length={title.length} max={TEXT_LIMITS.title} />
        </div>

        <input
          id={`title-${locale}`}
          name="title"
          type="text"
          defaultValue={translation?.title ?? ''}
          onChange={title.onChange}
          required
        />

        {state.fieldErrors?.title?.[0] && (
          <p className="admin-field-error">{state.fieldErrors.title[0]}</p>
        )}
      </div>

      <div className="admin-form-grid admin-form-grid-2">
        <div className="admin-field">
          <div className="admin-field-heading">
            <label htmlFor={`seoTitle-${locale}`}>SEO title</label>

            <CharCounter length={seoTitle.length} max={TEXT_LIMITS.seoTitle} />
          </div>

          <input
            id={`seoTitle-${locale}`}
            name="seoTitle"
            type="text"
            defaultValue={translation?.seoTitle ?? ''}
            onChange={seoTitle.onChange}
          />
        </div>

        <div className="admin-field">
          <div className="admin-field-heading">
            <label htmlFor={`summary-${locale}`}>Summary</label>

            <CharCounter length={summary.length} max={TEXT_LIMITS.summary} />
          </div>

          <textarea
            id={`summary-${locale}`}
            name="summary"
            rows={3}
            defaultValue={translation?.summary ?? ''}
            onChange={summary.onChange}
          />
        </div>
      </div>

      <div className="admin-field">
        <div className="admin-field-heading">
          <label htmlFor={`seoDescription-${locale}`}>SEO description</label>

          <CharCounter
            length={seoDescription.length}
            max={TEXT_LIMITS.seoDescription}
          />
        </div>

        <textarea
          id={`seoDescription-${locale}`}
          name="seoDescription"
          rows={4}
          defaultValue={translation?.seoDescription ?? ''}
          onChange={seoDescription.onChange}
        />
      </div>

      {showHighlightAndBody && (
        <>
          <div className="admin-field">
            <div className="admin-field-heading">
              <label htmlFor={`highlight-${locale}`}>Highlight</label>

              <CharCounter
                length={highlight.length}
                max={TEXT_LIMITS.highlight}
              />
            </div>

            <input
              id={`highlight-${locale}`}
              name="highlight"
              type="text"
              defaultValue={translation?.highlight ?? ''}
              onChange={highlight.onChange}
            />

            <p className="admin-field-help">
              Subtítulo o cita destacada de la página.
            </p>
          </div>

          <div className="admin-field">
            <div className="admin-field-heading">
              <label htmlFor={`body-${locale}`}>Body</label>

              <CharCounter length={body.length} max={TEXT_LIMITS.body} />
            </div>

            <textarea
              id={`body-${locale}`}
              name="body"
              rows={10}
              defaultValue={translation?.body ?? ''}
              onChange={body.onChange}
            />
          </div>
        </>
      )}

      {state.formError && <p className="admin-form-error">{state.formError}</p>}

      {state.success && (
        <p className="admin-form-success">Traducción guardada correctamente.</p>
      )}

      <div className="admin-form-actions">
        <button
          type="submit"
          className="admin-button admin-button-primary"
          disabled={pending}
        >
          {pending ? 'Guardando...' : `Guardar ${getLocaleLabel(locale)}`}
        </button>
      </div>
    </form>
  )
}
