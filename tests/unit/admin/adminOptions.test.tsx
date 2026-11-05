// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import {
  ContentStatusOptions,
  ContentTypeOptions,
  LocaleOptions,
  RatioOptions,
} from '@/components/admin/AdminOptions'
import { contentStatusSchema } from '@/modules/shared/domain/contentStatus'
import { contentTypeSchema } from '@/modules/shared/domain/contentType'
import {
  localeCode,
  localeLabel,
  localeSchema,
} from '@/modules/shared/domain/locale'
import { pinRatioSchema } from '@/modules/shared/domain/ratio'

/**
 * Las listas cerradas del ABM salen de los esquemas del dominio (ADM-D1 a D3
 * de la auditoría TSX): si el dominio añade un valor, el desplegable lo
 * recoge solo. Estos tests fijan esa correspondencia.
 */
function optionsOf(element: React.ReactElement) {
  const { container } = render(<select>{element}</select>)

  return Array.from(container.querySelectorAll('option')).map((option) => ({
    value: option.value,
    text: option.textContent,
  }))
}

describe('AdminOptions', () => {
  it('LocaleOptions: un <option> por idioma del dominio, con su nombre', () => {
    expect(optionsOf(<LocaleOptions />)).toEqual(
      localeSchema.options.map((locale) => ({
        value: locale,
        text: localeLabel(locale),
      })),
    )
    expect(optionsOf(<LocaleOptions />).map((o) => o.text)).toEqual([
      'Español',
      'English',
      'Català',
    ])
  })

  it('LocaleOptions display="value": el código en minúsculas (carga masiva)', () => {
    expect(optionsOf(<LocaleOptions display="value" />)).toEqual([
      { value: 'es', text: 'es' },
      { value: 'en', text: 'en' },
      { value: 'ca', text: 'ca' },
    ])
  })

  it('RatioOptions: los siete ratios del dominio, en su orden', () => {
    expect(optionsOf(<RatioOptions />)).toEqual(
      pinRatioSchema.options.map((ratio) => ({ value: ratio, text: ratio })),
    )
    expect(optionsOf(<RatioOptions />)).toHaveLength(7)
  })

  it('ContentTypeOptions: los cinco tipos con su etiqueta', () => {
    expect(optionsOf(<ContentTypeOptions />).map((o) => o.value)).toEqual([
      ...contentTypeSchema.options,
    ])
    expect(optionsOf(<ContentTypeOptions />).map((o) => o.text)).toEqual([
      'Case',
      'Insight',
      'Tool',
      'Episode',
      'Other',
    ])
  })

  it('ContentStatusOptions: borrador, programado y publicado', () => {
    expect(optionsOf(<ContentStatusOptions />)).toEqual([
      { value: 'draft', text: 'Borrador' },
      { value: 'scheduled', text: 'Programado' },
      { value: 'published', text: 'Publicado' },
    ])
    expect(optionsOf(<ContentStatusOptions />).map((o) => o.value)).toEqual([
      ...contentStatusSchema.options,
    ])
  })
})

describe('localeLabel / localeCode', () => {
  it('nombre en su idioma y código corto en mayúsculas', () => {
    expect(localeLabel('es')).toBe('Español')
    expect(localeLabel('en')).toBe('English')
    expect(localeLabel('ca')).toBe('Català')
    expect(localeCode('ca')).toBe('CA')
  })
})
