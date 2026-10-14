'use client'

import { useState } from 'react'

import { MAX_PINS_PER_CONTENT } from '@/modules/pin/domain/pinLimits'
import { parsePinCsv, type PinCsvRow } from '@/modules/pin/domain/pinCsv'
import { hasDerivedPinLabel } from '@/modules/pin/domain/derivedPinLabel'
import { validateImageSize } from '@/modules/media/domain/mediaLimits'
import { ratioMismatchMessage } from '@/modules/media/domain/ratioFromFilename'

import {
  assertLocalVideoWithinLimits,
  assertUploadedVideoWithinLimits,
  pinVideoRules,
} from '@/modules/media/client/videoUploadChecks'

import type { ContentType } from '@/modules/shared/domain/contentType'

import {
  createPinWithImageAction,
  createPinWithVideoAction,
} from '@/app/admin/(panel)/contents/[id]/edit/pinActions'
import {
  uploadImageFlow,
  uploadVideoFlow,
} from '@/app/admin/(panel)/contents/[id]/edit/useCloudinaryUpload'

import { regenerateRows, type Row } from './rows'

type Defaults = { ratio: string; language: string }

export function useBulkPinUpload({
  contentId,
  contentType,
  availableSlots,
}: {
  contentId: string
  contentType: ContentType
  // Huecos de pin que quedan en el contenido (máximo 8 por contenido).
  availableSlots: number
}) {
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

  function rebuildRows(
    nextFiles: File[],
    nextCsvRows: PinCsvRow[],
    // El valor recién elegido: el estado de React aún no se ha actualizado
    // cuando se llama desde el onChange de los selects por defecto.
    overrides: Partial<Defaults> = {},
  ) {
    const defaults: Defaults = {
      ratio: overrides.ratio ?? defaultRatio,
      language: overrides.language ?? defaultLanguage,
    }

    setRows((current) =>
      regenerateRows(current, nextFiles, nextCsvRows, defaults),
    )
  }

  function handleFilesChange(fileList: FileList | null) {
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
    rebuildRows(nextFiles, csvRows)
  }

  async function handleCsvChange(fileList: FileList | null) {
    const csvFile = fileList?.[0]

    if (!csvFile) {
      setCsvRows([])
      rebuildRows(files, [])
      return
    }

    const text = await csvFile.text()
    const parsed = parsePinCsv(text)

    setCsvRows(parsed)
    rebuildRows(files, parsed)
  }

  function changeDefaultRatio(ratio: string) {
    setDefaultRatio(ratio)
    rebuildRows(files, csvRows, { ratio })
  }

  function changeDefaultLanguage(language: string) {
    setDefaultLanguage(language)
    rebuildRows(files, csvRows, { language })
  }

  // Quita un archivo del lote antes de subirlo (p. ej. un vídeo elegido por
  // error o uno que ha fallado). Solo quita esa fila: NO se reconstruyen las
  // demás, para no perder su estado (las ya subidas siguen «Hecho») ni lo que
  // el admin haya editado en ellas. También sale de `files`: si no, cambiar
  // un valor por defecto regeneraría las filas y lo resucitaría.
  function removeRow(key: string) {
    const row = rows.find((item) => item.key === key)
    if (!row) return

    setFiles((current) => current.filter((file) => file !== row.file))
    setRows((current) => current.filter((item) => item.key !== key))
    setFormError(null)
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    )
  }

  // No se bloquea (el pin ya está creado): se avisa de que se recortará si
  // el ratio no encaja con el medio real (p. ej. un nombre mal puesto).
  function mismatchNote(
    row: Row,
    uploaded: { width: number; height: number },
  ): string | undefined {
    return (
      ratioMismatchMessage(
        row.ratio,
        uploaded.width,
        uploaded.height,
        row.ratioSource === 'filename' ? 'filename' : 'other',
      ) ?? undefined
    )
  }

  // Sube una imagen y crea su pin. Devuelve un aviso (o undefined).
  async function uploadImageRow(row: Row): Promise<string | undefined> {
    const uploaded = await uploadImageFlow(row.file, {
      beforeUpload: () => {
        const validation = validateImageSize(row.file.size)

        if (validation && validation.code === 'IMAGE_TOO_LARGE') {
          throw new Error(
            `La imagen supera el límite de ${validation.maxBytes / 1024 / 1024} MB.`,
          )
        }
      },
      register: (image) =>
        createPinWithImageAction({
          contentId,
          ratio: row.ratio,
          // En Case/Episode el feed nunca usa un texto escrito a mano.
          // Se deriva de título + cliente / tipo de episodio.
          label: derivedLabel ? null : row.label,
          language: row.language,
          autoplayMode: null,
          alt: row.alt,
          cloudinaryPublicId: image.public_id,
          format: image.format,
          width: image.width,
          height: image.height,
          bytes: image.bytes,
        }),
    })

    return uploaded ? mismatchNote(row, uploaded) : undefined
  }

  // Sube un vídeo y crea su pin (carga masiva con vídeo). Los
  // límites dependen del tipo de contenido: 15 s / 15 MB en tools, 8 s en el
  // resto. Mismas reglas y mensajes que PinMediaManager.
  async function uploadVideoRow(row: Row): Promise<string | undefined> {
    const rules = pinVideoRules(contentType)

    const uploaded = await uploadVideoFlow(row.file, {
      beforeUpload: () => assertLocalVideoWithinLimits(row.file, rules),
      afterUpload: (video) => assertUploadedVideoWithinLimits(video, rules),
      register: (video) =>
        createPinWithVideoAction({
          contentId,
          ratio: row.ratio,
          label: derivedLabel ? null : row.label,
          language: row.language,
          autoplayMode: videoAutoplay,
          alt: row.alt,
          cloudinaryPublicId: video.public_id,
          format: video.format,
          width: video.width,
          height: video.height,
          durationSeconds: video.duration,
          bytes: video.bytes,
        }),
    })

    return uploaded ? mismatchNote(row, uploaded) : undefined
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

      try {
        // Si algo falla tras subir el archivo, el flujo lo descarta de
        // Cloudinary antes de lanzar el error.
        const note =
          row.kind === 'video'
            ? await uploadVideoRow(row)
            : await uploadImageRow(row)

        updateRow(row.key, { status: 'ok', note })
      } catch (error) {
        updateRow(row.key, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Error al subir.',
        })
      }
    }

    setUploading(false)
  }

  return {
    derivedLabel,
    rows,
    defaultRatio,
    defaultLanguage,
    videoAutoplay,
    setVideoAutoplay,
    hasVideo: rows.some((row) => row.kind === 'video'),
    uploading,
    formError,
    okCount: rows.filter((row) => row.status === 'ok').length,
    errorCount: rows.filter((row) => row.status === 'error').length,
    handleFilesChange,
    handleCsvChange,
    changeDefaultRatio,
    changeDefaultLanguage,
    removeRow,
    updateRow,
    handleUploadAll,
  }
}
