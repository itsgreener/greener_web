'use client'

import { useActionState } from 'react'

import type { ContentTranslation } from '@/modules/content/domain/contentTranslationSchema'

import { TEXT_LIMITS } from '@/modules/content/domain/textLimits'

import { AdminLocaleBadge } from '@/components/admin/AdminBadge'
import { AdminCountedField } from '@/components/admin/AdminCountedField'
import {
  AdminForm,
  AdminFormFooter,
  AdminFormGrid,
} from '@/components/admin/AdminForm'
import {
  localeCode,
  localeLabel,
  type Locale,
} from '@/modules/shared/domain/locale'
import {
  saveTranslationAction,
  type TranslationActionState,
} from './translationActions'

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

  return (
    <AdminForm action={formAction}>
      <input type="hidden" name="contentId" value={contentId} />

      <input type="hidden" name="locale" value={locale} />

      <div className={styles.heading}>
        <div>
          <h3 className={styles.title}>{localeLabel(locale)}</h3>

          <p className={styles.text}>
            Contenido y metadatos para esta versión lingüística.
          </p>
        </div>

        <AdminLocaleBadge>{localeCode(locale)}</AdminLocaleBadge>
      </div>

      <AdminCountedField
        id={`title-${locale}`}
        name="title"
        label={newsletter ? 'Titular' : 'Título'}
        max={TEXT_LIMITS.title}
        defaultValue={translation?.title ?? ''}
        error={state.fieldErrors?.title?.[0]}
        required
      />

      <AdminFormGrid>
        {showSeo && (
          <AdminCountedField
            id={`seoTitle-${locale}`}
            name="seoTitle"
            label="SEO title"
            max={TEXT_LIMITS.seoTitle}
            defaultValue={translation?.seoTitle ?? ''}
          />
        )}

        {showSummary && (
          <AdminCountedField
            id={`summary-${locale}`}
            name="summary"
            label={newsletter ? 'Texto de apoyo' : 'Summary'}
            max={TEXT_LIMITS.summary}
            kind="textarea"
            rows={3}
            defaultValue={translation?.summary ?? ''}
          />
        )}
      </AdminFormGrid>

      {showSeo && (
        <AdminCountedField
          id={`seoDescription-${locale}`}
          name="seoDescription"
          label="SEO description"
          max={TEXT_LIMITS.seoDescription}
          kind="textarea"
          rows={4}
          defaultValue={translation?.seoDescription ?? ''}
        />
      )}

      {showHighlightAndBody && (
        <>
          <AdminCountedField
            id={`highlight-${locale}`}
            name="highlight"
            label="Highlight"
            max={TEXT_LIMITS.highlight}
            defaultValue={translation?.highlight ?? ''}
            help="Subtítulo o cita destacada de la página."
          />

          <AdminCountedField
            id={`body-${locale}`}
            name="body"
            label="Body"
            max={TEXT_LIMITS.body}
            kind="textarea"
            rows={10}
            defaultValue={translation?.body ?? ''}
          />
        </>
      )}

      <AdminFormFooter
        state={state}
        pending={pending}
        label={`Guardar ${localeLabel(locale)}`}
        successMessage="Traducción guardada correctamente."
      />
    </AdminForm>
  )
}
