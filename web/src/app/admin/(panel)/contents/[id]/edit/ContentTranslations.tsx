'use client'

import { useState } from 'react'

import type { ContentTranslation } from '@/modules/content/domain/contentTranslationSchema'

import TranslationForm from './TranslationForm'

import type { ContentType } from '@/modules/shared/domain/contentType'
import type { Locale } from '@/modules/shared/domain/locale'
import type { OtherKind } from '@/modules/content/domain/otherSchema'
type Props = {
  contentId: string
  contentType: ContentType
  defaultLocale: Locale
  translations: ContentTranslation[]
  /** Subtipo de un `other`; null en el resto de tipos. */
  otherKind?: OtherKind | null
}

const allLocales: Locale[] = ['es', 'en', 'ca']

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

function getLocaleShortLabel(locale: Locale) {
  return locale.toUpperCase()
}

export default function ContentTranslations({
  contentId,
  contentType,
  defaultLocale,
  translations,
  otherKind = null,
}: Props) {
  // Episodio y other se muestran en un solo idioma: el principal. Un other no
  // tiene versión por idioma en el feed (plan de other, §3).
  const locales =
    contentType === 'episode' || contentType === 'other'
      ? [defaultLocale]
      : allLocales

  const [activeLocale, setActiveLocale] = useState<Locale>(defaultLocale)

  // especificacion-final-formato-detalle.md §3:
  // highlight/body son campos propios del formato
  // de detalle tipo B (caso/episodio).
  const showHighlightAndBody =
    contentType === 'case' || contentType === 'episode'

  return (
    <div className="admin-translations">
      {locales.length > 1 && (
        <div
          className="admin-language-tabs"
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
                className={
                  isActive
                    ? 'admin-language-tab admin-language-tab-active'
                    : 'admin-language-tab'
                }
                onClick={() => setActiveLocale(locale)}
              >
                <span>{getLocaleShortLabel(locale)}</span>

                <small>{getLocaleLabel(locale)}</small>

                <span
                  className={
                    translation
                      ? 'admin-language-state admin-language-state-complete'
                      : 'admin-language-state admin-language-state-empty'
                  }
                  aria-hidden="true"
                />
              </button>
            )
          })}
        </div>
      )}

      <div className="admin-language-panels">
        {locales.map((locale) => {
          const translation =
            translations.find((item) => item.locale === locale) ?? null

          const isActive = activeLocale === locale

          return (
            <div
              key={locale}
              role="tabpanel"
              hidden={!isActive}
              className="admin-language-panel"
            >
              <TranslationForm
                contentId={contentId}
                locale={locale}
                translation={translation}
                showHighlightAndBody={showHighlightAndBody}
                // Case y episodio no usan summary: su texto es highlight + body.
                // Una página satélite solo necesita título: su contenido es el paquete.
                showSummary={
                  contentType !== 'case' &&
                  contentType !== 'episode' &&
                  otherKind !== 'page'
                }
                // El SEO de un other no se usa: la newsletter no tiene página y
                // la satélite saca su head del manifest del paquete.
                showSeo={contentType !== 'other'}
                newsletter={otherKind === 'newsletter'}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
