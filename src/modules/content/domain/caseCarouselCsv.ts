/**
 * Plantilla CSV de la carga masiva del carrusel de un caso: `filename,alt`.
 * El lector es el compartido con los pines (`modules/shared/domain/csv.ts`),
 * así que valen los mismos separadores (`,` o `;`) y se ignoran las columnas
 * que el carrusel no usa: el CSV de los pines (`filename,label,ratio,
 * language,alt`) sirve tal cual.
 *
 * El CSV solo aporta el texto alternativo. No decide el orden de las
 * diapositivas (ver `caseCarouselOrder.ts`).
 */

import { normalizeFilename, parseCsvRecords } from '@/modules/shared/domain/csv'

export type CarouselCsvRow = {
  filename: string
  alt?: string
}

const COLUMN_ALIASES: Record<string, keyof CarouselCsvRow> = {
  filename: 'filename',
  alt: 'alt',
}

function hasFilename(
  record: Partial<Record<keyof CarouselCsvRow, string>>,
): record is CarouselCsvRow {
  return Boolean(record.filename)
}

/**
 * La cabecera es obligatoria y debe incluir `filename`; `alt` es opcional.
 * Una fila sin nombre de archivo se descarta: no hay con qué emparejarla.
 */
export function parseCarouselCsv(text: string): CarouselCsvRow[] {
  return parseCsvRecords(text, COLUMN_ALIASES).filter(hasFilename)
}

/**
 * Empareja por nombre de archivo, sin distinguir mayúsculas ni la forma
 * Unicode de las tildes. Si un nombre aparece en dos filas gana la primera.
 */
export function findCarouselCsvRow(
  rows: readonly CarouselCsvRow[],
  filename: string,
): CarouselCsvRow | undefined {
  const wanted = normalizeFilename(filename)

  return rows.find((row) => normalizeFilename(row.filename) === wanted)
}

export type CarouselCsvReport = {
  /** Filas del CSV que no corresponden a ningún archivo seleccionado. */
  unmatchedCsvNames: string[]
  /** Archivos seleccionados que no tienen fila en el CSV. */
  filesWithoutRow: string[]
}

/**
 * Qué no ha encajado entre el CSV y los archivos: sirve para avisar de un
 * nombre mal escrito antes de subir nada. Los nombres salen en el orden en
 * que se pasaron.
 */
export function reportCarouselCsv(
  csvRows: readonly CarouselCsvRow[],
  filenames: readonly string[],
): CarouselCsvReport {
  const selected = new Set(filenames.map(normalizeFilename))
  const inCsv = new Set(csvRows.map((row) => normalizeFilename(row.filename)))

  return {
    unmatchedCsvNames: csvRows
      .filter((row) => !selected.has(normalizeFilename(row.filename)))
      .map((row) => row.filename),
    filesWithoutRow: filenames.filter(
      (filename) => !inCsv.has(normalizeFilename(filename)),
    ),
  }
}
