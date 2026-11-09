/**
 * Lector de CSV mínimo y sin dependencias, compartido por las plantillas de
 * carga masiva del ABM (pines y carrusel de un caso). Deliberadamente sin
 * librería externa (papaparse, etc.): el formato que hace falta soportar es
 * simple y no vale la pena una dependencia nueva para esto.
 *
 * Qué entiende, porque es lo que sale de Excel, Numbers y Google Sheets:
 *  - Separador `,` o `;` (Excel con configuración regional española exporta
 *    con `;`). Se decide con la primera línea.
 *  - BOM al principio («CSV UTF-8» de Excel).
 *  - Campos entre comillas dobles, con comas, saltos de línea y comillas
 *    escapadas (`""`) dentro.
 *  - Saltos de línea `\n`, `\r\n` y `\r`.
 *  - Líneas en blanco (o solo con separadores): se descartan.
 */

const BOM = /^﻿/

/**
 * Cuenta `,` y `;` en la primera línea, fuera de comillas. Gana `;` solo si
 * hay más que comas: sin ninguno (una sola columna) vale la coma.
 */
function detectDelimiter(text: string): ',' | ';' {
  let commas = 0
  let semicolons = 0
  let inQuotes = false

  for (const char of text) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (!inQuotes) {
      if (char === '\n' || char === '\r') break
      if (char === ',') commas += 1
      if (char === ';') semicolons += 1
    }
  }

  return semicolons > commas ? ';' : ','
}

/**
 * Convierte el texto en filas de celdas, sin recortar ni interpretar nada.
 * Una comilla solo abre un campo entre comillas si es lo primero que hay en
 * él (`5" de ancho` conserva su comilla); así una comilla suelta no se traga
 * el resto del archivo.
 */
export function parseCsvTable(text: string): string[][] {
  const source = text.replace(BOM, '')
  const delimiter = detectDelimiter(source)
  const table: string[][] = []

  let row: string[] = []
  let field = ''
  let inQuotes = false

  function endField() {
    row.push(field)
    field = ''
  }

  function endRow() {
    endField()

    if (row.some((cell) => cell.trim() !== '')) table.push(row)

    row = []
  }

  for (let index = 0; index < source.length; index++) {
    const char = source[index]

    if (inQuotes) {
      if (char !== '"') {
        field += char
      } else if (source[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        inQuotes = false
      }
    } else if (char === '"' && field.trim() === '') {
      inQuotes = true
    } else if (char === delimiter) {
      endField()
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1

      endRow()
    } else {
      field += char
    }
  }

  if (field !== '' || row.length > 0) endRow()

  return table
}

/**
 * Lee un CSV con cabecera. `aliases` dice qué nombres de columna (en
 * minúsculas) valen y a qué clave canónica van; cualquier otra columna se
 * ignora en vez de fallar, para que una plantilla con alguna columna de más
 * no rompa la carga entera. Los valores van recortados y una celda que falta
 * queda vacía.
 */
export function parseCsvRecords<Key extends string>(
  text: string,
  aliases: Readonly<Record<string, Key>>,
): Array<Partial<Record<Key, string>>> {
  const [headerRow, ...bodyRows] = parseCsvTable(text)

  if (!headerRow) return []

  // `hasOwn` y no `aliases[name]`: una columna llamada `constructor` o
  // `toString` no puede resolverse a lo que hereda cualquier objeto.
  const header = headerRow.map((column) => {
    const name = column.trim().toLowerCase()

    return Object.hasOwn(aliases, name) ? aliases[name] : null
  })

  return bodyRows.map((cells) => {
    const record: Partial<Record<Key, string>> = {}

    header.forEach((key, index) => {
      if (key) record[key] = (cells[index] ?? '').trim()
    })

    return record
  })
}

/**
 * Clave con la que se comparan nombres de archivo del CSV y del selector:
 * sin distinguir mayúsculas y con la misma normalización Unicode. macOS puede
 * entregar «café.jpg» con la tilde descompuesta (NFD) mientras que el CSV la
 * trae compuesta (NFC): sin esto no emparejarían aunque se vean iguales.
 */
export function normalizeFilename(name: string): string {
  return name.normalize('NFC').toLowerCase()
}
