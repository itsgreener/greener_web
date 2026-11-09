import { pluralize } from '@/app/admin/_lib/pluralize'
import type { QueueRow } from '@/app/admin/_lib/useUploadQueue'
import {
  findCarouselCsvRow,
  reportCarouselCsv,
  type CarouselCsvRow,
} from '@/modules/content/domain/caseCarouselCsv'
import { sortByNaturalName } from '@/modules/content/domain/caseCarouselOrder'

/** Una diapositiva del lote, a la espera de subirse o ya subida. */
export type SlideRow = QueueRow & {
  key: string
  file: File
  alt: string
  // De dónde sale el alt: el CSV, lo que ha escrito el admin o nadie todavía.
  altSource: 'csv' | 'manual' | 'none'
}

function csvAltFor(
  csvRows: readonly CarouselCsvRow[],
  filename: string,
): string {
  return findCarouselCsvRow(csvRows, filename)?.alt?.trim() ?? ''
}

/**
 * Filas del lote a partir de los archivos elegidos (ya filtrados por tipo) y
 * del CSV. Van en orden natural de nombre: es el orden en que se añadirán
 * las diapositivas. El alt solo sale del CSV; sin fila o sin alt queda vacío
 * y el admin lo escribe en la tabla (no se inventa uno a partir del nombre).
 */
export function buildRows(
  files: readonly File[],
  csvRows: readonly CarouselCsvRow[],
): SlideRow[] {
  return sortByNaturalName(files).map((file, index) => {
    const alt = csvAltFor(csvRows, file.name)

    return {
      key: `${index}-${file.name}`,
      file,
      alt,
      altSource: alt ? 'csv' : 'none',
      status: 'pending',
    }
  })
}

/**
 * Aplica un CSV nuevo (o su ausencia) a las filas que ya hay. Respeta lo que
 * el admin haya escrito a mano y las filas ya subidas (o subiéndose): solo
 * cambian las que no tenían alt o lo tenían del CSV anterior.
 */
export function applyCsvToRows(
  rows: readonly SlideRow[],
  csvRows: readonly CarouselCsvRow[],
): SlideRow[] {
  return rows.map((row) => {
    if (
      row.altSource === 'manual' ||
      row.status === 'ok' ||
      row.status === 'uploading'
    ) {
      return row
    }

    const alt = csvAltFor(csvRows, row.file.name)

    return { ...row, alt, altSource: alt ? 'csv' : 'none' }
  })
}

/** «a.jpg, b.jpg, c.jpg y 2 más»: no llena la pantalla con un lote grande. */
export function listNames(names: readonly string[], limit = 5): string {
  const shown = names.slice(0, limit).join(', ')
  const hidden = names.length - limit

  return hidden > 0 ? `${shown} y ${hidden} más` : shown
}

/**
 * Avisos sobre cómo ha encajado el CSV con los archivos elegidos, para que
 * un nombre mal escrito se vea antes de subir. Sin archivos elegidos no hay
 * con qué comparar.
 */
export function describeCsvIssues(
  csvRows: readonly CarouselCsvRow[],
  filenames: readonly string[],
): string[] {
  if (csvRows.length === 0) {
    return [
      'El CSV no contiene ninguna fila válida: la primera línea debe incluir la columna filename.',
    ]
  }

  const issues: string[] = []

  if (csvRows.every((row) => row.alt === undefined)) {
    issues.push('El CSV no trae la columna alt.')
  }

  if (filenames.length === 0) return issues

  const { unmatchedCsvNames, filesWithoutRow } = reportCarouselCsv(
    csvRows,
    filenames,
  )

  if (unmatchedCsvNames.length > 0) {
    issues.push(
      `El CSV tiene ${unmatchedCsvNames.length} ${pluralize(unmatchedCsvNames.length, 'fila', 'filas')} sin archivo en la selección: ${listNames(unmatchedCsvNames)}.`,
    )
  }

  if (filesWithoutRow.length > 0) {
    issues.push(
      `${filesWithoutRow.length} ${pluralize(filesWithoutRow.length, 'archivo no aparece', 'archivos no aparecen')} en el CSV: ${listNames(filesWithoutRow)}. Escribe su alt en la tabla.`,
    )
  }

  return issues
}
