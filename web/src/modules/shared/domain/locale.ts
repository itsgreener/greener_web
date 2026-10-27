import { z } from 'zod'

/** Idiomas de un contenido. Mismo conjunto que el enum `locale` de Postgres. */
export const localeSchema = z.enum(['es', 'en', 'ca'])

export type Locale = z.infer<typeof localeSchema>

/** Nombre de cada idioma en su propio idioma (selectores y cabeceras). */
const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  ca: 'Català',
}

export function localeLabel(locale: Locale): string {
  return LOCALE_LABELS[locale]
}

/** Código corto del idioma: ES, EN, CA. */
export function localeCode(locale: Locale): string {
  return locale.toUpperCase()
}
