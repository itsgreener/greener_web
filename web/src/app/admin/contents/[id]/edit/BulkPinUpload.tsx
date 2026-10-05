'use client'

import { useState } from 'react'
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
  closestClosedRatio,
  isPinRatioValue,
  mediaMatchesRatio,
} from '@/modules/media/domain/closestRatio'

import {
  getSignedImageUpload,
  getSignedVideoUpload,
  uploadImageToCloudinary,
  uploadVideoToCloudinary,
} from '@/modules/media/infrastructure/cloudinaryUpload'

import { readLocalVideoDuration } from '@/modules/media/infrastructure/readLocalVideoDuration'

import {
  createPinWithImageAction,
  createPinWithVideoAction,
} from './pinActions'
import { discardUploadQuietly, type UploadedAssetRef } from './discardUpload'

type Props = {
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
  language: string
  alt: string
  queueOrder: string
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
  defaults: { ratio: string; language: string; queueOrderStart: number },
): Row {
  return {
    key: `${file.name}-${index}`,
    file,
    kind: detectKind(file),
    label: csvRow?.label || labelFromFilename(file.name),
    ratio: csvRow?.ratio || defaults.ratio,
    language: csvRow?.language || defaults.language,
    alt: csvRow?.alt || labelFromFilename(file.name),
    queueOrder: csvRow?.queueOrder ?? String(defaults.queueOrderStart + index),
    status: 'pending',
  }
}

export default function BulkPinUpload({ contentId, contentType }: Props) {
  const derivedLabel =
    contentType === 'case' ||
    contentType === 'episode' ||
    contentType === 'insight'

  const [files, setFiles] = useState<File[]>([])
  const [csvRows, setCsvRows] = useState<PinCsvRow[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [defaultRatio, setDefaultRatio] = useState('1:1')
  const [defaultLanguage, setDefaultLanguage] = useState('es')
  const [queueOrderStart, setQueueOrderStart] = useState(0)
  // Cómo se reproducen en el feed los pines de vídeo del lote (los de
  // imagen no usan este valor). Un vídeo de más de 8 s se queda en poster
  // aunque aquí se elija «viewport»: lo decide la duración (canAnimateInFeed).
  const [videoAutoplay, setVideoAutoplay] = useState<'viewport' | 'hover'>(
    'viewport',
  )
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function regenerateRows(nextFiles: File[], nextCsvRows: PinCsvRow[]) {
    const defaults = {
      ratio: defaultRatio,
      language: defaultLanguage,
      queueOrderStart,
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
    const nextFiles = fileList ? Array.from(fileList) : []

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
      showAsCarousel: true,
      language: row.language,
      autoplayMode: null,
      speedMs: null,
      queueOrder: Number(row.queueOrder) || 0,
      alt: row.alt,
      cloudinaryPublicId: uploaded.public_id,
      format: uploaded.format,
      width: uploaded.width,
      height: uploaded.height,
      bytes: uploaded.bytes,
    })

    if (!result.ok) throw new Error(result.error)

    return undefined
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
      showAsCarousel: true,
      language: row.language,
      autoplayMode: videoAutoplay,
      speedMs: null,
      queueOrder: Number(row.queueOrder) || 0,
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
    if (
      isPinRatioValue(row.ratio) &&
      !mediaMatchesRatio(uploaded.width, uploaded.height, row.ratio)
    ) {
      const suggested = closestClosedRatio(uploaded.width, uploaded.height)

      return `Su ratio real (${uploaded.width}×${uploaded.height}, parecido a ${suggested}) no es el del pin (${row.ratio}) y se verá recortado.`
    }

    return undefined
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
      <h4>Carga masiva</h4>

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
          ? 'filename,ratio,language,alt,queueOrder'
          : 'filename,label,ratio,language,alt,queueOrder'}
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
            regenerateRows(files, csvRows)
          }}
        >
          {RATIOS.map((ratio) => (
            <option key={ratio} value={ratio}>
              {ratio}
            </option>
          ))}
        </select>

        <label htmlFor="bulk-default-language">Idioma por defecto</label>
        <select
          id="bulk-default-language"
          value={defaultLanguage}
          onChange={(event) => {
            setDefaultLanguage(event.target.value)
            regenerateRows(files, csvRows)
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

        <label htmlFor="bulk-queue-start">Orden en cola inicial</label>
        <input
          id="bulk-queue-start"
          type="number"
          min={0}
          value={queueOrderStart}
          onChange={(event) => {
            const value = Number(event.target.value) || 0
            setQueueOrderStart(value)
            regenerateRows(files, csvRows)
          }}
        />
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
              <th>Orden</th>
              <th>Estado</th>
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
                      updateRow(row.key, { ratio: event.target.value })
                    }
                  >
                    {RATIOS.map((ratio) => (
                      <option key={ratio} value={ratio}>
                        {ratio}
                      </option>
                    ))}
                  </select>
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
                  <input
                    type="number"
                    min={0}
                    value={row.queueOrder}
                    disabled={uploading}
                    onChange={(event) =>
                      updateRow(row.key, { queueOrder: event.target.value })
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
