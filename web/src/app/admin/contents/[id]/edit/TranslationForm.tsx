'use client'

import { useActionState } from 'react'

import type { Locale } from '@/modules/content/domain/contentSchema'

import type { ContentTranslation } from '@/modules/content/domain/contentTranslationSchema'

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

  return (
    <form action={formAction}>
      <input type="hidden" name="contentId" value={contentId} />

      <input type="hidden" name="locale" value={locale} />

      <h3>{getLocaleLabel(locale)}</h3>

      <div>
        <label htmlFor={`title-${locale}`}>Título</label>

        <input
          id={`title-${locale}`}
          name="title"
          type="text"
          defaultValue={translation?.title ?? ''}
          required
        />

        {state.fieldErrors?.title?.[0] && <p>{state.fieldErrors.title[0]}</p>}
      </div>

      <div>
        <label htmlFor={`seoTitle-${locale}`}>SEO title</label>

        <input
          id={`seoTitle-${locale}`}
          name="seoTitle"
          type="text"
          defaultValue={translation?.seoTitle ?? ''}
        />
      </div>

      <div>
        <label htmlFor={`seoDescription-${locale}`}>SEO description</label>

        <textarea
          id={`seoDescription-${locale}`}
          name="seoDescription"
          defaultValue={translation?.seoDescription ?? ''}
        />
      </div>

      <div>
        <label htmlFor={`summary-${locale}`}>Summary</label>

        <textarea
          id={`summary-${locale}`}
          name="summary"
          defaultValue={translation?.summary ?? ''}
        />
      </div>

      {showHighlightAndBody && (
        <>
          <div>
            <label htmlFor={`highlight-${locale}`}>
              Highlight (subtítulo / cita destacada)
            </label>

            <input
              id={`highlight-${locale}`}
              name="highlight"
              type="text"
              defaultValue={translation?.highlight ?? ''}
            />
          </div>

          <div>
            <label htmlFor={`body-${locale}`}>Body</label>

            <textarea
              id={`body-${locale}`}
              name="body"
              rows={8}
              defaultValue={translation?.body ?? ''}
            />
          </div>
        </>
      )}

      {state.formError && <p>{state.formError}</p>}

      {state.success && <p>Traducción guardada correctamente.</p>}

      <button type="submit" disabled={pending}>
        {pending ? 'Guardando...' : `Guardar ${getLocaleLabel(locale)}`}
      </button>
    </form>
  )
}
