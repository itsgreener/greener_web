import { findCsvRowForFile, type PinCsvRow } from '@/modules/pin/domain/pinCsv'
import { ratioFromFilename } from '@/modules/media/domain/ratioFromFilename'

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
}

export const RATIOS = ['1:1', '4:3', '4:5', '3:4', '2:3', '9:16', '16:9']
export const LANGUAGES = ['es', 'en', 'ca']

// MP4, WebM y MOV. Se mira el tipo MIME y, como
// respaldo, la extensión: algunos sistemas no informan del MIME de un .mov.
const VIDEO_EXTENSION = /\.(mp4|webm|mov|m4v)$/i

function detectKind(file: File): RowKind {
  return file.type.toLowerCase().startsWith('video/') ||
    VIDEO_EXTENSION.test(file.name)
    ? 'video'
    : 'image'
}

function labelFromFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
}

export function buildRow(
  file: File,
  index: number,
  csvRow: PinCsvRow | undefined,
  defaults: { ratio: string; language: string },
): Row {
  // Prioridad: CSV > nombre del archivo > ratio por defecto. Si el nombre no
  // trae una proporción legible no se aplica nada (queda el valor por defecto).
  const filenameRatio = ratioFromFilename(file.name)

  const ratio = csvRow?.ratio || filenameRatio || defaults.ratio

  const ratioSource: Row['ratioSource'] = csvRow?.ratio
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
    language: csvRow?.language || defaults.language,
    alt: csvRow?.alt || labelFromFilename(file.name),
    status: 'pending',
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
  defaults: { ratio: string; language: string },
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
