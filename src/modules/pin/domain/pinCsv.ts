/**
 * Plantilla CSV de la carga masiva de pines (§15.4: "rótulo, CTA, ratio,
 * idioma, alt y queue_order"). El lector es el compartido de
 * `modules/shared/domain/csv.ts`: aquí solo se dice qué columnas vale cada
 * cosa en un pin.
 */

import { normalizeFilename, parseCsvRecords } from '@/modules/shared/domain/csv'

export type PinCsvRow = {
  filename: string
  label?: string
  ratio?: string
  language?: string
  alt?: string
}

// Alias de cabecera aceptados, normalizados a la clave canónica de
// PinCsvRow. Cualquier columna que no esté aquí se ignora (en vez de
// fallar), para que una plantilla con alguna columna de más no rompa la
// carga entera.
const COLUMN_ALIASES: Record<string, keyof PinCsvRow> = {
  filename: 'filename',
  label: 'label',
  ratio: 'ratio',
  language: 'language',
  lang: 'language',
  alt: 'alt',
}

function hasFilename(
  record: Partial<Record<keyof PinCsvRow, string>>,
): record is PinCsvRow {
  return Boolean(record.filename)
}

/**
 * La cabecera es obligatoria y debe incluir "filename" — el resto de
 * columnas son opcionales; una fila sin "filename" (o vacío) se descarta,
 * porque no hay forma de emparejarla con ningún archivo subido.
 */
export function parsePinCsv(text: string): PinCsvRow[] {
  return parseCsvRecords(text, COLUMN_ALIASES).filter(hasFilename)
}

/**
 * Empareja por nombre de archivo, sin distinguir mayúsculas ni la forma
 * Unicode de las tildes (`normalizeFilename`).
 */
export function findCsvRowForFile(
  rows: PinCsvRow[],
  filename: string,
): PinCsvRow | undefined {
  const wanted = normalizeFilename(filename)

  return rows.find((row) => normalizeFilename(row.filename) === wanted)
}
