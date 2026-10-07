'use client'

import { useState } from 'react'
import { MAX_PINS_PER_CONTENT } from '@/modules/pin/domain/pinLimits'
import type { ContentType } from '@/modules/content/domain/contentSchema'

import {
  parsePinCsv,
  findCsvRowForFile,
  type PinCsvRow,
} from '@/modules/pin/domain/pinCsv'

import {
  pinVideoLimitsFor,
  validateImageUpload,
  validatePinVideoUpload,
} from '@/modules/media/domain/mediaLimits'

import {
  getSignedImageUpload,
  getSignedVideoUpload,
  uploadImageToCloudinary,
  uploadVideoToCloudinary,
} from '@/modules/media/infrastructure/cloudinaryUpload'

import {
  ratioFromFilename,
  ratioMismatchMessage,
} from '@/modules/media/domain/ratioFromFilename'

import { readLocalVideoDuration } from '@/modules/media/infrastructure/readLocalVideoDuration'

import {
  createPinWithImageAction,
  createPinWithVideoAction,
} from './pinActions'
import { discardUploadQuietly, type UploadedAssetRef } from './discardUpload'
import { hasDerivedPinLabel } from '@/modules/pin/domain/derivedPinLabel'

type Props = {
  // Huecos de pin que quedan en el contenido (máximo 8 por contenido).
  availableSlots: number
  contentId: string
  contentType: ContentType
}

type RowStatus = 'pending' | 'uploading' | 'ok' | 'error'

type RowKind = 'image' | 'video'

type Row = {
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

const RATIOS = ['1:1', '4:3', '4:5', '3:4', '2:3', '9:16', '16:9']
const LANGUAGES = ['es', 'en', 'ca']

// MP4, WebM y MOV (decisión del 5 oct 2026). Se mira el tipo MIME y, como
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

function buildRow(
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

export default function BulkPinUpload({
  contentId,
  contentType,
  availableSlots,
}: Props) {
  const derivedLabel = hasDerivedPinLabel(contentType)

  const [files, setFiles] = useState<File[]>([])
  const [csvRows, setCsvRows] = useState<PinCsvRow[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [defaultRatio, setDefaultRatio] = useState('1:1')
  const [defaultLanguage, setDefaultLanguage] = useState('es')
  // Cómo se reproducen en el feed los pines de vídeo del lote (los de
  // imagen no usan este valor). Un vídeo de más de 8 s se queda en poster
  // aunque aquí se elija «viewport»: lo decide la duración (canAnimateInFeed).
  const [videoAutoplay, setVideoAutoplay] = useState<'viewport' | 'hover'>(
    'viewport',
  )
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function regenerateRows(
    nextFiles: File[],
    nextCsvRows: PinCsvRow[],
    // El valor recién elegido: el estado de React aún no se ha actualizado
    // cuando se llama desde el onChange de los selects por defecto.
    overrides: Partial<{ ratio: string; language: string }> = {},
  ) {
    const defaults = {
      ratio: overrides.ratio ?? defaultRatio,
      language: overrides.language ?? defaultLanguage,
    }

    setRows(
      nextFiles.map((file, index) =>
        buildRow(
          file,
          index,
          findCsvRowForFile(nextCsvRows, file.name),
          defaults,
        ),
      ),
    )
  }

  async function handleFilesChange(fileList: FileList | null) {
    const selected = fileList ? Array.from(fileList) : []
    // Máximo de 8 pines por contenido: no se admiten más archivos que
    // huecos libres (lo impone también la base de datos).
    const nextFiles = selected.slice(0, availableSlots)

    setFormError(
      selected.length > availableSlots
        ? `Solo quedan ${availableSlots} huecos de pin en este contenido (máximo ${MAX_PINS_PER_CONTENT}): se han descartado ${selected.length - availableSlots} archivos.`
        : null,
    )

    setFiles(nextFiles)
    regenerateRows(nextFiles, csvRows)
  }

  async function handleCsvChange(fileList: FileList | null) {
    const csvFile = fileList?.[0]

    if (!csvFile) {
      setCsvRows([])
      regenerateRows(files, [])
      return
    }

    const text = await csvFile.text()
    const parsed = parsePinCsv(text)

    setCsvRows(parsed)
    regenerateRows(files, parsed)
  }

  // Quita un archivo del lote antes de subirlo (p. ej. un vídeo elegido por
  // error). También sale de `files`: si no, cambiar un valor por defecto
  // regeneraría las filas y lo resucitaría.
  function removeRow(key: string) {
    const row = rows.find((item) => item.key === key)
    if (!row) return

    const nextFiles = files.filter((file) => file !== row.file)

    setFiles(nextFiles)
    regenerateRows(nextFiles, csvRows)
    setFormError(null)
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    )
  }

  // Sube una imagen y crea su pin. Devuelve un aviso (o undefined).
  async function uploadImageRow(
    row: Row,
    track: (asset: UploadedAssetRef) => void,
  ): Promise<string | undefined> {
    const validation = validateImageUpload(row.file.size)

    if (validation && validation.code === 'IMAGE_TOO_LARGE') {
      throw new Error(
        `La imagen supera el límite de ${validation.maxBytes / 1024 / 1024} MB.`,
      )
    }

    const signed = await getSignedImageUpload()
    const uploaded = await uploadImageToCloudinary(row.file, signed)

    track({ publicId: uploaded.public_id, kind: 'image' })

    const result = await createPinWithImageAction({
      contentId,
      ratio: row.ratio,
      // En Case/Episode el feed nunca usa un texto escrito a mano.
      // Se deriva de título + cliente / tipo de episodio.
      label: derivedLabel ? null : row.label,
      language: row.language,
      autoplayMode: null,
      alt: row.alt,
      cloudinaryPublicId: uploaded.public_id,
      format: uploaded.format,
      width: uploaded.width,
      height: uploaded.height,
      bytes: uploaded.bytes,
    })

    if (!result.ok) throw new Error(result.error)

    // No se bloquea (el pin ya está creado): se avisa de que se recortará
    // si el ratio no encaja con la imagen real (p. ej. un nombre mal puesto).
    return (
      ratioMismatchMessage(
        row.ratio,
        uploaded.width,
        uploaded.height,
        row.ratioSource === 'filename' ? 'filename' : 'other',
      ) ?? undefined
    )
  }

  // Sube un vídeo y crea su pin (carga masiva con vídeo, 5 oct 2026). Los
  // límites dependen del tipo de contenido: 15 s / 15 MB en tools, 8 s en el
  // resto. Mismas reglas y mensajes que PinMediaManager.
  async function uploadVideoRow(
    row: Row,
    track: (asset: UploadedAssetRef) => void,
  ): Promise<string | undefined> {
    const limits = pinVideoLimitsFor(contentType)
    const maxMb = limits.maxSizeBytes / 1024 / 1024

    // `null` = el navegador no ha podido dar una duración fiable (WebM sin
    // cabecera, .mov/HEVC…): no se bloquea aquí, se valida después con la
    // duración real de Cloudinary. Ver readLocalVideoDuration.
    const localDuration = await readLocalVideoDuration(row.file)

    if (localDuration !== null) {
      const validation = validatePinVideoUpload(
        contentType,
        row.file.size,
        localDuration,
      )

      if (validation?.code === 'ANIMATION_TOO_LONG') {
        throw new Error(
          `El vídeo no puede superar los ${validation.maxSeconds} segundos.`,
        )
      }

      if (validation?.code === 'VIDEO_TOO_LARGE') {
        throw new Error(
          `El vídeo supera los ${validation.maxBytes / 1024 / 1024} MB.`,
        )
      }
    } else if (row.file.size > limits.maxSizeBytes) {
      throw new Error(`El vídeo supera los ${maxMb} MB.`)
    }

    const signed = await getSignedVideoUpload()
    const uploaded = await uploadVideoToCloudinary(row.file, signed)

    track({ publicId: uploaded.public_id, kind: 'video' })

    const finalValidation = validatePinVideoUpload(
      contentType,
      uploaded.bytes,
      uploaded.duration,
    )

    if (finalValidation?.code === 'ANIMATION_TOO_LONG') {
      throw new Error(
        `El vídeo dura más de los ${finalValidation.maxSeconds} segundos permitidos para un pin (el archivo subido se ha descartado y no se ha guardado).`,
      )
    }

    if (finalValidation?.code === 'VIDEO_TOO_LARGE') {
      throw new Error(
        `El vídeo supera los ${finalValidation.maxBytes / 1024 / 1024} MB (el archivo subido se ha descartado y no se ha guardado).`,
      )
    }

    const result = await createPinWithVideoAction({
      contentId,
      ratio: row.ratio,
      label: derivedLabel ? null : row.label,
      language: row.language,
      autoplayMode: videoAutoplay,
      alt: row.alt,
      cloudinaryPublicId: uploaded.public_id,
      format: uploaded.format,
      width: uploaded.width,
      height: uploaded.height,
      durationSeconds: uploaded.duration,
      bytes: uploaded.bytes,
    })

    if (!result.ok) throw new Error(result.error)

    // Los vídeos deben venir en uno de los 7 ratios: no se bloquea (ya está
    // guardado), se avisa de que se recortará si no encaja con el del pin.
    return (
      ratioMismatchMessage(
        row.ratio,
        uploaded.width,
        uploaded.height,
        row.ratioSource === 'filename' ? 'filename' : 'other',
      ) ?? undefined
    )
  }

  async function handleUploadAll() {
    setFormError(null)

    if (rows.length === 0) {
      setFormError('Selecciona al menos un archivo.')
      return
    }

    const invalidRow = rows.find(
      (row) => (!derivedLabel && !row.label.trim()) || !row.alt.trim(),
    )

    if (invalidRow) {
      setFormError(
        derivedLabel
          ? `"${invalidRow.file.name}" no tiene alt — complétalo antes de subir el lote.`
          : `"${invalidRow.file.name}" no tiene frase gancho o alt — complétalo antes de subir el lote.`,
      )
      return
    }

    setUploading(true)

    // Secuencial, no en paralelo: son subidas directas a Cloudinary desde
    // el navegador, y un lote de cientos de archivos en paralelo satura
    // la conexión del admin sin necesidad.
    for (const row of rows) {
      if (row.status === 'ok') continue

      updateRow(row.key, { status: 'uploading', error: undefined })

      let uploadedAsset: UploadedAssetRef | null = null

      try {
        const track = (asset: UploadedAssetRef) => {
          uploadedAsset = asset
        }

        const note =
          row.kind === 'video'
            ? await uploadVideoRow(row, track)
            : await uploadImageRow(row, track)

        updateRow(row.key, { status: 'ok', note })
      } catch (error) {
        // Archivo ya subido que no llegó a registrarse: se descarta para no
        // dejar basura en Cloudinary (el servidor comprueba que no esté en
        // media_asset antes de borrar nada).
        await discardUploadQuietly(uploadedAsset)

        updateRow(row.key, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Error al subir.',
        })
      }
    }

    setUploading(false)
  }

  const okCount = rows.filter((row) => row.status === 'ok').length
  const errorCount = rows.filter((row) => row.status === 'error').length

  return (
    <div>
      {derivedLabel && (
        <p>
          El texto del feed es automático para{' '}
          {contentType === 'case'
            ? 'Case'
            : contentType === 'insight'
              ? 'Insight'
              : 'Episode'}
          . No se usa ninguna frase gancho del CSV ni del nombre del archivo.
        </p>
      )}

      <label htmlFor="bulk-files">Imágenes y vídeos (varios)</label>
      <input
        id="bulk-files"
        type="file"
        accept="image/*,video/*,.mov,.mp4,.webm"
        multiple
        disabled={uploading}
        onChange={(event) => handleFilesChange(event.target.files)}
      />

      <label htmlFor="bulk-csv">
        Plantilla CSV (opcional):{' '}
        {derivedLabel
          ? 'filename,ratio,language,alt'
          : 'filename,label,ratio,language,alt'}
      </label>
      <input
        id="bulk-csv"
        type="file"
        accept=".csv,text/csv"
        disabled={uploading}
        onChange={(event) => handleCsvChange(event.target.files)}
      />

      <fieldset disabled={uploading}>
        <legend>
          Campos comunes (se usan cuando el CSV no trae ese valor)
        </legend>

        <label htmlFor="bulk-default-ratio">Ratio por defecto</label>
        <select
          id="bulk-default-ratio"
          value={defaultRatio}
          onChange={(event) => {
            setDefaultRatio(event.target.value)
            regenerateRows(files, csvRows, { ratio: event.target.value })
          }}
        >
          {RATIOS.map((ratio) => (
            <option key={ratio} value={ratio}>
              {ratio}
            </option>
          ))}
        </select>
        <small>
          Solo se usa si el CSV y el nombre del archivo no indican proporción
          (nombre esperado: nombre-1x1-tipo.jpg).
        </small>

        <label htmlFor="bulk-default-language">Idioma por defecto</label>
        <select
          id="bulk-default-language"
          value={defaultLanguage}
          onChange={(event) => {
            setDefaultLanguage(event.target.value)
            regenerateRows(files, csvRows, { language: event.target.value })
          }}
        >
          {LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {language}
            </option>
          ))}
        </select>

        <label htmlFor="bulk-video-autoplay">
          Reproducción de los vídeos en el feed
        </label>
        <select
          id="bulk-video-autoplay"
          value={videoAutoplay}
          onChange={(event) =>
            setVideoAutoplay(event.target.value as 'viewport' | 'hover')
          }
        >
          <option value="viewport">Al entrar en pantalla</option>
          <option value="hover">Al pasar el ratón</option>
        </select>
      </fieldset>

      {rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Archivo</th>
              <th>{derivedLabel ? 'Texto del feed' : 'Frase gancho'}</th>
              <th>Ratio</th>
              <th>Idioma</th>
              <th>Alt</th>
              <th>Estado</th>
              <th>Quitar</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.file.name}</td>

                <td>
                  {derivedLabel ? (
                    <span>Automático</span>
                  ) : (
                    <input
                      value={row.label}
                      disabled={uploading}
                      onChange={(event) =>
                        updateRow(row.key, { label: event.target.value })
                      }
                    />
                  )}
                </td>

                <td>
                  <select
                    value={row.ratio}
                    disabled={uploading}
                    onChange={(event) =>
                      updateRow(row.key, {
                        ratio: event.target.value,
                        ratioSource: 'manual',
                      })
                    }
                  >
                    {RATIOS.map((ratio) => (
                      <option key={ratio} value={ratio}>
                        {ratio}
                      </option>
                    ))}
                  </select>
                  {row.ratioSource === 'filename' && (
                    <small> detectado del nombre</small>
                  )}
                </td>

                <td>
                  <select
                    value={row.language}
                    disabled={uploading}
                    onChange={(event) =>
                      updateRow(row.key, { language: event.target.value })
                    }
                  >
                    {LANGUAGES.map((language) => (
                      <option key={language} value={language}>
                        {language}
                      </option>
                    ))}
                  </select>
                </td>

                <td>
                  <input
                    value={row.alt}
                    disabled={uploading}
                    onChange={(event) =>
                      updateRow(row.key, { alt: event.target.value })
                    }
                  />
                </td>

                <td>
                  {row.status === 'pending' && 'Pendiente'}
                  {row.status === 'uploading' && 'Subiendo...'}
                  {row.status === 'ok' &&
                    (row.note ? `Hecho. Aviso: ${row.note}` : 'Hecho')}
                  {row.status === 'error' && `Error: ${row.error}`}
                </td>

                <td>
                  {row.status !== 'ok' && row.status !== 'uploading' && (
                    <button
                      type="button"
                      disabled={uploading}
                      aria-label={`Quitar ${row.file.name} del lote`}
                      onClick={() => removeRow(row.key)}
                    >
                      Quitar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {formError && <p>{formError}</p>}

      {rows.length > 0 && (
        <button type="button" disabled={uploading} onClick={handleUploadAll}>
          {uploading ? 'Subiendo lote...' : `Subir ${rows.length} pines`}
        </button>
      )}

      {(okCount > 0 || errorCount > 0) && (
        <p>
          {okCount} subidos correctamente
          {errorCount > 0 && `, ${errorCount} con error`}.
        </p>
      )}
    </div>
  )
}
