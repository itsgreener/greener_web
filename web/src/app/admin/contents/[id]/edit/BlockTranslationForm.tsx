'use client'

import { useActionState } from 'react'

import type { Locale } from '@/modules/content/domain/contentSchema'

import type {
  ContentBlockTranslation,
  ContentBlockType,
} from '@/modules/content/domain/contentBlockSchema'

import {
  saveBlockTranslationAction,
  type BlockTranslationActionState,
} from './blockActions'

type Props = {
  contentId: string
  blockId: string
  blockType: ContentBlockType
  locale: Locale
  translation: ContentBlockTranslation | null
}

const initialState: BlockTranslationActionState = {}

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

export default function BlockTranslationForm({
  contentId,
  blockId,
  blockType,
  locale,
  translation,
}: Props) {
  const [state, formAction, pending] = useActionState(
    saveBlockTranslationAction,
    initialState,
  )

  if (blockType === 'links_credits') {
    return null
  }

  const showRichText = blockType === 'rich_text'

  const showQuote = blockType === 'quote'

  const showCaption =
    blockType === 'image' || blockType === 'carousel' || blockType === 'video'

  return (
    <form action={formAction}>
      <input type="hidden" name="contentId" value={contentId} />

      <input type="hidden" name="blockId" value={blockId} />

      <input type="hidden" name="locale" value={locale} />

      <h4>{getLocaleLabel(locale)}</h4>

      {showRichText && (
        <div>
          <label htmlFor={`body-${blockId}-${locale}`}>Contenido</label>

          <textarea
            id={`body-${blockId}-${locale}`}
            name="bodyRichText"
            rows={8}
            defaultValue={translation?.bodyRichText ?? ''}
          />
        </div>
      )}

      {showCaption && (
        <div>
          <label htmlFor={`caption-${blockId}-${locale}`}>Caption</label>

          <textarea
            id={`caption-${blockId}-${locale}`}
            name="caption"
            defaultValue={translation?.caption ?? ''}
          />
        </div>
      )}

      {showQuote && (
        <div>
          <label htmlFor={`quote-${blockId}-${locale}`}>Quote</label>

          <textarea
            id={`quote-${blockId}-${locale}`}
            name="quoteText"
            rows={5}
            defaultValue={translation?.quoteText ?? ''}
          />
        </div>
      )}

      {state.formError && <p>{state.formError}</p>}

      {state.success && <p>Traducción del bloque guardada.</p>}

      <button type="submit" disabled={pending}>
        {pending ? 'Guardando...' : `Guardar ${getLocaleLabel(locale)}`}
      </button>
    </form>
  )
}
