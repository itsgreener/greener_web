'use client'

import { useState } from 'react'

import { cx } from '@/lib/cx'

import { contentCapabilities } from '@/app/admin/_lib/contentCapabilities'
import type { ContentTranslation } from '@/modules/content/domain/contentTranslationSchema'

import type { ContentType } from '@/modules/shared/domain/contentType'
import {
  localeCode,
  localeLabel,
  localeSchema,
  type Locale,
} from '@/modules/shared/domain/locale'
import type { OtherKind } from '@/modules/content/domain/otherSchema'
import TranslationForm from './TranslationForm'

import styles from './ContentTranslations.module.css'

type Props = {
  contentId: string
  contentType: ContentType
  defaultLocale: Locale
  translations: ContentTranslation[]
  /** Subtipo de un `other`; null en el resto de tipos. */
  otherKind?: OtherKind | null
}

export default function ContentTranslations({
  contentId,
  contentType,
  defaultLocale,
  translations,
  otherKind = null,
}: Props) {
  const { allLocales, hasHighlightAndBody, hasSummary, hasSeo } =
    contentCapabilities(contentType, otherKind)
  const locales = allLocales ? localeSchema.options : [defaultLocale]

  const [activeLocale, setActiveLocale] = useState<Locale>(defaultLocale)

  return (
    <div>
      {locales.length > 1 && (
        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Idioma de la traducción"
        >
          {locales.map((locale) => {
            const translation =
              translations.find((item) => item.locale === locale) ?? null

            const isActive = activeLocale === locale

            return (
              <button
                key={locale}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={cx(styles.tab, isActive && styles.active)}
                onClick={() => setActiveLocale(locale)}
              >
                <span>{localeCode(locale)}</span>

                <small>{localeLabel(locale)}</small>

                <span
                  className={cx(
                    styles.state,
                    translation ? styles.complete : styles.empty,
                  )}
                  aria-hidden="true"
                />
              </button>
            )
          })}
        </div>
      )}

      <div>
        {locales.map((locale) => {
          const translation =
            translations.find((item) => item.locale === locale) ?? null

          const isActive = activeLocale === locale

          return (
            <div key={locale} role="tabpanel" hidden={!isActive}>
              <TranslationForm
                contentId={contentId}
                locale={locale}
                translation={translation}
                showHighlightAndBody={hasHighlightAndBody}
                showSummary={hasSummary}
                showSeo={hasSeo}
                newsletter={otherKind === 'newsletter'}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
