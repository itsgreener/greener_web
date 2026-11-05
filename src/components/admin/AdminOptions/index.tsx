import {
  contentStatusLabel,
  contentTypeLabel,
} from '@/components/admin/contentLabels'
import { contentStatusSchema } from '@/modules/shared/domain/contentStatus'
import { contentTypeSchema } from '@/modules/shared/domain/contentType'
import { localeLabel, localeSchema } from '@/modules/shared/domain/locale'
import { pinRatioSchema } from '@/modules/shared/domain/ratio'

/*
 * `<option>` de las listas cerradas del dominio (idiomas, ratios, tipos y
 * estados). Salen de los propios esquemas zod, que son la fuente de verdad
 * (los mismos enums que Postgres): si el dominio añade un valor, todos los
 * desplegables del ABM lo recogen sin tocar el JSX. Se usan dentro de un
 * `AdminSelect`, que pone él mismo las opciones vacías («Todos los tipos»…).
 */

/** Español, English, Català. Con `display="value"`, el código en minúsculas. */
export function LocaleOptions({
  display = 'name',
}: {
  display?: 'name' | 'value'
}) {
  return localeSchema.options.map((locale) => (
    <option key={locale} value={locale}>
      {display === 'name' ? localeLabel(locale) : locale}
    </option>
  ))
}

/** Los siete ratios cerrados de un pin (`1:1`, `4:3`… `16:9`). */
export function RatioOptions() {
  return pinRatioSchema.options.map((ratio) => (
    <option key={ratio} value={ratio}>
      {ratio}
    </option>
  ))
}

/** Case, Insight, Tool, Episode, Other. */
export function ContentTypeOptions() {
  return contentTypeSchema.options.map((type) => (
    <option key={type} value={type}>
      {contentTypeLabel(type)}
    </option>
  ))
}

/** Borrador, Programado, Publicado. */
export function ContentStatusOptions() {
  return contentStatusSchema.options.map((status) => (
    <option key={status} value={status}>
      {contentStatusLabel(status)}
    </option>
  ))
}
