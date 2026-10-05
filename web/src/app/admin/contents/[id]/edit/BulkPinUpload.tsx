'use client'

import { useState } from 'react'
import type { ContentType } from '@/modules/content/domain/contentSchema'

import {
  parsePinCsv,
  findCsvRowForFile,
  type PinCsvRow,
} from '@/modules/pin/domain/pinCsv'

import { validateImageUpload } from '@/modules/media/domain/mediaLimits'

import {
  getSignedImageUpload,
  uploadImageToCloudinary,
} from '@/modules/media/infrastructure/cloudinaryUpload'

import { createPinWithImageAction } from './pinActions'
import { discardUploadQuietly, type UploadedAssetRef } from './discardUpload'

type Props = {
  contentId: string
  contentType: ContentType
}

type RowStatus = 'pending' | 'uploading' | 'ok' | 'error'

type Row = {
  key: string
  file: File
  label: string
  ratio: string
  language: string
  alt: string
  queueOrder: string
  status: RowStatus
  error?: string
}

const RATIOS = ['1:1', '4:3', '4:5', '3:4', '2:3', '9:16', '16:9']
const LANGUAGES = ['es', 'en', 'ca']

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
        const validation = validateImageUpload(row.file.size)

        if (validation && validation.code === 'IMAGE_TOO_LARGE') {
          throw new Error(
            `La imagen supera el límite de ${validation.maxBytes / 1024 / 1024} MB.`,
          )
        }

        const signed = await getSignedImageUpload()
        const uploaded = await uploadImageToCloudinary(row.file, signed)

        uploadedAsset = { publicId: uploaded.public_id, kind: 'image' }

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

        updateRow(row.key, { status: 'ok' })
      } catch (error) {
        // Imagen ya subida que no llegó a registrarse: se descarta para no
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

      <label htmlFor="bulk-files">Imágenes (varias)</label>
      <input
        id="bulk-files"
        type="file"
        accept="image/*"
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
                  {row.status === 'ok' && 'Hecho'}
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
