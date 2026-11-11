import { isVideoFile } from '@/modules/media/client/mediaFileKind'
import { ratioFromFilename } from '@/modules/media/domain/ratioFromFilename'
import { findCsvRowForFile, type PinCsvRow } from '@/modules/pin/domain/pinCsv'

export type RowStatus = 'pending' | 'uploading' | 'ok' | 'error'

export type RowKind = 'image' | 'video'

export type Row = {
  key: string
  file: File
  kind: RowKind
  label: string
  ratio: string
  // De dónde sale el ratio: el CSV, el nombre del archivo
  // (`[nombre]-[proporción]-[tipo].ext`), el valor por defecto o el admin.
  ratioSource: 'csv' | 'filename' | 'default' | 'manual'
  language: string
  alt: string
  status: RowStatus
  error?: string
  // Aviso no bloqueante de una fila ya subida (p. ej. ratio del vídeo).
  note?: string
  // Carrusel de pines (§2.150): el CSV o el nombre del archivo traían un ratio
  // distinto del único del carrusel y se ha ignorado.
  ratioIgnored?: boolean
}

/**
 * Orden natural por nombre de archivo («2» antes que «10»): es el orden de las
 * diapositivas de un carrusel de pines. Los pines se suben de uno en uno, así
 * que el orden de las filas es el orden en que se crean (`queue_order`).
 */
export function sortFilesNaturally(files: File[]): File[] {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' }),
  )
}

function detectKind(file: File): RowKind {
  return isVideoFile(file) ? 'video' : 'image'
}

function labelFromFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
}

export type RowDefaults = {
  ratio: string
  language: string
  // Idioma impuesto por el contenido (un solo idioma): gana al CSV y al valor
  // por defecto.
  fixedLanguage?: string | null
  // Carrusel de pines (§2.150): todas las diapositivas llevan este ratio y se
  // ignora el del CSV y el del nombre del archivo.
  forceRatio?: string | null
}

function buildRow(
  file: File,
  index: number,
  csvRow: PinCsvRow | undefined,
  defaults: RowDefaults,
): Row {
  // Prioridad: CSV > nombre del archivo > ratio por defecto. Si el nombre no
  // trae una proporción legible no se aplica nada (queda el valor por defecto).
  const filenameRatio = ratioFromFilename(file.name)

  const requestedRatio = csvRow?.ratio || filenameRatio
  const forced = defaults.forceRatio ?? null

  const ratio = forced ?? (requestedRatio || defaults.ratio)

  const ratioSource: Row['ratioSource'] = forced
    ? 'default'
    : csvRow?.ratio
      ? 'csv'
      : filenameRatio
        ? 'filename'
        : 'default'

  return {
    key: `${file.name}-${index}`,
    file,
    kind: detectKind(file),
    label: csvRow?.label || labelFromFilename(file.name),
    ratio,
    ratioSource,
    language: defaults.fixedLanguage || csvRow?.language || defaults.language,
    alt: csvRow?.alt || labelFromFilename(file.name),
    status: 'pending',
    ratioIgnored:
      forced !== null && !!requestedRatio && requestedRatio !== forced,
  }
}

/**
 * Reconstruye las filas a partir de los archivos y el CSV. Una fila que ya
 * se ha subido (o se está subiendo) NO se regenera: su pin ya existe y
 * volver a «pendiente» haría que el siguiente «Subir» lo duplicara. Se
 * reconoce por el archivo, no por la clave (que lleva el índice y cambia al
 * quitar filas).
 */
export function regenerateRows(
  current: Row[],
  files: File[],
  csvRows: PinCsvRow[],
  defaults: RowDefaults,
): Row[] {
  return files.map((file, index) => {
    const existing = current.find((row) => row.file === file)

    if (
      existing &&
      (existing.status === 'ok' || existing.status === 'uploading')
    ) {
      return existing
    }

    return buildRow(
      file,
      index,
      findCsvRowForFile(csvRows, file.name),
      defaults,
    )
  })
}
