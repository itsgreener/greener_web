/**
 * Parser de CSV mínimo, sin dependencias, para la plantilla de carga
 * masiva de pines (§15.4: "rótulo, CTA, ratio, idioma, alt y
 * queue_order"). Deliberadamente sin librería externa (papaparse, etc.):
 * el formato que hace falta soportar es simple (cabecera + filas, comillas
 * dobles para escapar comas dentro de un campo) y no vale la pena una
 * dependencia nueva para esto.
 */

export type PinCsvRow = {
  filename: string
  label?: string
  cta?: string
  ratio?: string
  language?: string
  alt?: string
  queueOrder?: string
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)

  return result
}

// Alias de cabecera aceptados, normalizados a la clave canónica de
// PinCsvRow. Cualquier columna que no esté aquí se ignora (en vez de
// fallar), para que una plantilla con alguna columna de más no rompa la
// carga entera.
const COLUMN_ALIASES: Record<string, keyof PinCsvRow> = {
  filename: 'filename',
  label: 'label',
  cta: 'cta',
  ratio: 'ratio',
  language: 'language',
  lang: 'language',
  alt: 'alt',
  queueorder: 'queueOrder',
  queue_order: 'queueOrder',
  'queue order': 'queueOrder',
}

/**
 * La cabecera es obligatoria y debe incluir "filename" — el resto de
 * columnas son opcionales; una fila sin "filename" (o vacío) se descarta,
 * porque no hay forma de emparejarla con ningún archivo subido.
 */
export function parsePinCsv(text: string): PinCsvRow[] {
  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim() !== '')

  if (lines.length === 0) {
    return []
  }

  const rawHeader = parseCsvLine(lines[0]).map((column) =>
    column.trim().toLowerCase(),
  )

  const header = rawHeader.map((column) => COLUMN_ALIASES[column] ?? null)

  const rows: PinCsvRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])

    const row: Partial<Record<keyof PinCsvRow, string>> = {}

    header.forEach((column, index) => {
      if (column) {
        row[column] = (values[index] ?? '').trim()
      }
    })

    if (!row.filename) {
      continue
    }

    rows.push(row as PinCsvRow)
  }

  return rows
}

/** Empareja por nombre de archivo exacto, sin distinguir mayúsculas. */
export function findCsvRowForFile(
  rows: PinCsvRow[],
  filename: string,
): PinCsvRow | undefined {
  return rows.find(
    (row) => row.filename.toLowerCase() === filename.toLowerCase(),
  )
}
