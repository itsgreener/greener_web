import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { parseCsvTable } from '@/modules/shared/domain/csv'

/**
 * Ida y vuelta: lo que se escribe como CSV (todos los campos entre comillas,
 * con las comillas escapadas) se lee igual, con cualquiera de los dos
 * separadores y con comas, puntos y comas, comillas y saltos de línea dentro
 * de los campos. Las filas en blanco se descartan, así que se generan con
 * algún campo con contenido.
 */

const CHAR = fc.constantFrom('a', 'b', ' ', ',', ';', '"', '\n', '\r', 'ñ', 'é')

const CELL = fc.array(CHAR, { maxLength: 8 }).map((chars) => chars.join(''))

function tableArb() {
  return fc.integer({ min: 2, max: 4 }).chain((columns) =>
    fc
      .array(
        fc
          .array(CELL, { minLength: columns, maxLength: columns })
          .filter((row) => row.some((cell) => cell.trim() !== '')),
        { minLength: 1, maxLength: 6 },
      )
      .map((rows) => rows),
  )
}

function serialize(table: string[][], delimiter: ',' | ';', eol: string) {
  return table
    .map((row) =>
      row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(delimiter),
    )
    .join(eol)
}

describe('parseCsvTable — propiedades', () => {
  it.each([',', ';'] as const)(
    'ida y vuelta con el separador %s',
    (delimiter) => {
      fc.assert(
        fc.property(
          tableArb(),
          fc.constantFrom('\n', '\r\n', '\r'),
          (table, eol) => {
            expect(parseCsvTable(serialize(table, delimiter, eol))).toEqual(
              table,
            )
          },
        ),
      )
    },
  )

  it('un BOM delante no cambia el resultado', () => {
    fc.assert(
      fc.property(tableArb(), (table) => {
        const text = serialize(table, ',', '\n')

        expect(parseCsvTable(`﻿${text}`)).toEqual(parseCsvTable(text))
      }),
    )
  })

  it('nunca lanza, con el texto que sea', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (text) => {
        expect(() => parseCsvTable(text)).not.toThrow()
      }),
    )
  })
})
