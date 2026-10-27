import { describe, expect, it } from 'vitest'

import { codeOf, sourceFiles } from '@tests/helpers/sourceFiles'

/**
 * Las listas cerradas (idiomas, ratios y tipos de contenido) viven en el
 * dominio (`localeSchema`, `pinRatioSchema`, `contentTypeSchema`). La UI las
 * recorre desde ahí: una copia a mano se queda atrás el día que el dominio
 * cambie (auditoría TSX, ADM-D1 a D3 y PUB-D1, 26 oct 2026).
 */
const UI_DIRS = ['src/app/admin', 'src/components', 'src/app/(public)']

// Dos ficheros nombran los cinco tipos a propósito: las tarjetas de «Nuevo
// contenido» (con un test que las ata a `contentTypeSchema`, ADM-E3) y las
// reglas de `contentCapabilities`, que deciden qué lleva el editor de cada
// tipo (ADM-D4); no son listas que recorrer sino una regla por tipo.
const TYPE_NAMING_ALLOWED = [
  'src/app/admin/(panel)/contents/new/newContentOptions.ts',
  'src/app/admin/_lib/contentCapabilities.ts',
]

const RATIOS = ['1:1', '4:3', '4:5', '3:4', '2:3', '9:16', '16:9']
const CONTENT_TYPES = ['case', 'insight', 'tool', 'episode', 'other']

function distinctQuoted(code: string, values: string[]) {
  return values.filter((value) => new RegExp(`['"\`]${value}['"\`]`).test(code))
}

// Los tres idiomas seguidos en un array: ['es', 'en', 'ca'] (en cualquier orden).
const LOCALE_ARRAY =
  /\[\s*['"](es|en|ca)['"]\s*,\s*['"](es|en|ca)['"]\s*,\s*['"](es|en|ca)['"]/
const LOCALE_OPTION = /<option[^>]*value=\{?['"](es|en|ca)['"]/

describe('listas cerradas en la UI', () => {
  const files = sourceFiles(...UI_DIRS)

  it('hay ficheros que vigilar', () => {
    expect(files.length).toBeGreaterThan(150)
  })

  it('los detectores reconocen una lista a mano', () => {
    expect("const l = ['es', 'en', 'ca']").toMatch(LOCALE_ARRAY)
    expect('<option value="es">Español</option>').toMatch(LOCALE_OPTION)
    expect(
      distinctQuoted("['1:1', '4:5', '16:9']", RATIOS).length,
    ).toBeGreaterThanOrEqual(3)
    expect(
      distinctQuoted("['case', 'insight', 'tool', 'episode']", CONTENT_TYPES)
        .length,
    ).toBeGreaterThanOrEqual(4)
  })

  it('ningún fichero lleva los idiomas escritos a mano', () => {
    const offenders = files.filter((file) => {
      const code = codeOf(file)

      return LOCALE_ARRAY.test(code) || LOCALE_OPTION.test(code)
    })

    expect(offenders).toEqual([])
  })

  it('ningún fichero lista a mano tres o más ratios', () => {
    const offenders = files.filter(
      (file) => distinctQuoted(codeOf(file), RATIOS).length >= 3,
    )

    expect(offenders).toEqual([])
  })

  it('ningún fichero lista a mano cuatro o más tipos de contenido', () => {
    const naming = files.filter(
      (file) => distinctQuoted(codeOf(file), CONTENT_TYPES).length >= 4,
    )

    expect(
      naming.filter((file) => !TYPE_NAMING_ALLOWED.includes(file)),
    ).toEqual([])
    // Si una excepción deja de nombrar los tipos, sobra de la lista.
    expect(
      TYPE_NAMING_ALLOWED.filter((file) => !naming.includes(file)),
    ).toEqual([])
  })
})
