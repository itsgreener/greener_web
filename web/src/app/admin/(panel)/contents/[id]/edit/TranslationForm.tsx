'use client'

import { useActionState } from 'react'

import type { ContentTranslation } from '@/modules/content/domain/contentTranslationSchema'

import { TEXT_LIMITS } from '@/modules/content/domain/textLimits'

import { AdminButton } from '@/components/admin/AdminButton'
import { AdminLocaleBadge } from '@/components/admin/AdminBadge'
import { AdminInput, AdminTextarea } from '@/components/admin/AdminControls'
import { AdminField } from '@/components/admin/AdminField'
import {
  AdminForm,
  AdminFormActions,
  AdminFormGrid,
} from '@/components/admin/AdminForm'
import { AdminMessage } from '@/components/admin/AdminMessage'
import { CharCounter } from '@/components/admin/CharCounter'

import { useCharCount } from '@/components/admin/useCharCount'

import {
  saveTranslationAction,
  type TranslationActionState,
} from './translationActions'

import type { Locale } from '@/modules/shared/domain/locale'

import styles from './TranslationForm.module.css'

type Props = {
  contentId: string
  locale: Locale
  translation: ContentTranslation | null
  showHighlightAndBody: boolean
  // Case y episodio no usan summary: su texto es highlight + body.
  showSummary: boolean
  // El SEO solo tiene sentido en contenidos con página pública propia.
  showSeo: boolean
  // Pin de newsletter: título = titular de la tarjeta, summary = texto de apoyo.
  newsletter: boolean
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
  showSummary,
  showSeo,
  newsletter,
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
    <AdminForm action={formAction}>
      <input type="hidden" name="contentId" value={contentId} />

      <input type="hidden" name="locale" value={locale} />

      <div className={styles.heading}>
        <div>
          <h3 className={styles.title}>{getLocaleLabel(locale)}</h3>

          <p className={styles.text}>
            Contenido y metadatos para esta versión lingüística.
          </p>
        </div>

        <AdminLocaleBadge>{locale.toUpperCase()}</AdminLocaleBadge>
      </div>

      <AdminField
        label={newsletter ? 'Titular' : 'Título'}
        htmlFor={`title-${locale}`}
        aside={<CharCounter length={title.length} max={TEXT_LIMITS.title} />}
        error={state.fieldErrors?.title?.[0]}
      >
        <AdminInput
          id={`title-${locale}`}
          name="title"
          type="text"
          defaultValue={translation?.title ?? ''}
          onChange={title.onChange}
          required
        />
      </AdminField>

      <AdminFormGrid>
        {showSeo && (
          <AdminField
            label="SEO title"
            htmlFor={`seoTitle-${locale}`}
            aside={
              <CharCounter
                length={seoTitle.length}
                max={TEXT_LIMITS.seoTitle}
              />
            }
          >
            <AdminInput
              id={`seoTitle-${locale}`}
              name="seoTitle"
              type="text"
              defaultValue={translation?.seoTitle ?? ''}
              onChange={seoTitle.onChange}
            />
          </AdminField>
        )}

        {showSummary && (
          <AdminField
            label={newsletter ? 'Texto de apoyo' : 'Summary'}
            htmlFor={`summary-${locale}`}
            aside={
              <CharCounter length={summary.length} max={TEXT_LIMITS.summary} />
            }
          >
            <AdminTextarea
              id={`summary-${locale}`}
              name="summary"
              rows={3}
              defaultValue={translation?.summary ?? ''}
              onChange={summary.onChange}
            />
          </AdminField>
        )}
      </AdminFormGrid>

      {showSeo && (
        <AdminField
          label="SEO description"
          htmlFor={`seoDescription-${locale}`}
          aside={
            <CharCounter
              length={seoDescription.length}
              max={TEXT_LIMITS.seoDescription}
            />
          }
        >
          <AdminTextarea
            id={`seoDescription-${locale}`}
            name="seoDescription"
            rows={4}
            defaultValue={translation?.seoDescription ?? ''}
            onChange={seoDescription.onChange}
          />
        </AdminField>
      )}

      {showHighlightAndBody && (
        <>
          <AdminField
            label="Highlight"
            htmlFor={`highlight-${locale}`}
            aside={
              <CharCounter
                length={highlight.length}
                max={TEXT_LIMITS.highlight}
              />
            }
            help="Subtítulo o cita destacada de la página."
          >
            <AdminInput
              id={`highlight-${locale}`}
              name="highlight"
              type="text"
              defaultValue={translation?.highlight ?? ''}
              onChange={highlight.onChange}
            />
          </AdminField>

          <AdminField
            label="Body"
            htmlFor={`body-${locale}`}
            aside={<CharCounter length={body.length} max={TEXT_LIMITS.body} />}
          >
            <AdminTextarea
              id={`body-${locale}`}
              name="body"
              rows={10}
              defaultValue={translation?.body ?? ''}
              onChange={body.onChange}
            />
          </AdminField>
        </>
      )}

      {state.formError && (
        <AdminMessage kind="error">{state.formError}</AdminMessage>
      )}

      {state.success && (
        <AdminMessage kind="success">
          Traducción guardada correctamente.
        </AdminMessage>
      )}

      <AdminFormActions>
        <AdminButton type="submit" variant="primary" disabled={pending}>
          {pending ? 'Guardando...' : `Guardar ${getLocaleLabel(locale)}`}
        </AdminButton>
      </AdminFormActions>
    </AdminForm>
  )
}
