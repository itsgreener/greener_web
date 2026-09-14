import type {
  ContentType,
  Locale,
} from '@/modules/content/domain/contentSchema'

import type { ContentTranslation } from '@/modules/content/domain/contentTranslationSchema'

import TranslationForm from './TranslationForm'

type Props = {
  contentId: string
  contentType: ContentType
  defaultLocale: Locale
  translations: ContentTranslation[]
}

const allLocales: Locale[] = ['es', 'en', 'ca']

export default function ContentTranslations({
  contentId,
  contentType,
  defaultLocale,
  translations,
}: Props) {
  const locales = contentType === 'episode' ? [defaultLocale] : allLocales

  // especificacion-final-formato-detalle.md §3: highlight/body son
  // campos propios del formato de detalle tipo B (caso/episodio) — el
  // resto de tipos no los usa.
  const showHighlightAndBody =
    contentType === 'case' || contentType === 'episode'

  return (
    <div>
      {locales.map((locale) => {
        const translation =
          translations.find((item) => item.locale === locale) ?? null

        return (
          <TranslationForm
            key={locale}
            contentId={contentId}
            locale={locale}
            translation={translation}
            showHighlightAndBody={showHighlightAndBody}
          />
        )
      })}
    </div>
  )
}
