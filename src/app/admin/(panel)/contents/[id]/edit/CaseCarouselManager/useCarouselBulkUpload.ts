'use client'

import { useState } from 'react'

import { pluralize } from '@/app/admin/_lib/pluralize'
import { useUploadQueue } from '@/app/admin/_lib/useUploadQueue'
import {
  addCaseCarouselImageAction,
  addCaseCarouselVideoAction,
} from '@/app/admin/(panel)/contents/[id]/edit/caseCarouselActions'
import {
  uploadImageFlow,
  uploadVideoFlow,
} from '@/app/admin/(panel)/contents/[id]/edit/useCloudinaryUpload'
import { useEditorRefresh } from '@/app/admin/(panel)/contents/[id]/edit/useEditorOperation'
import {
  parseCarouselCsv,
  type CarouselCsvRow,
} from '@/modules/content/domain/caseCarouselCsv'
import { nextCarouselSortOrder } from '@/modules/content/domain/caseCarouselOrder'
import {
  assertLocalVideoWithinLimits,
  assertUploadedVideoWithinLimits,
  contentVideoRules,
} from '@/modules/media/client/videoUploadChecks'
import {
  fileAcceptFor,
  matchesMediaKind,
} from '@/modules/media/client/mediaFileKind'
import { validateImageSelection } from '@/modules/media/client/validateImageSelection'
import type { MediaKind } from '@/modules/shared/domain/mediaKind'

import {
  applyCsvToRows,
  buildRows,
  describeCsvIssues,
  listNames,
  type SlideRow,
} from './rows'
import type { CarouselItem } from './types'

const VIDEO_RULES = contentVideoRules(
  'el archivo subido se ha descartado y no se ha guardado en el caso',
)

const ACCEPTED_FORMATS: Record<MediaKind, string> = {
  image: 'JPG, PNG, WebP o AVIF (sin GIF ni animaciones)',
  video: 'MP4, WebM o MOV',
}

const BATCH_NOUN: Record<MediaKind, string> = {
  image: 'imágenes',
  video: 'vídeos',
}

function rowKey(row: SlideRow) {
  return row.key
}

function discardedMessage(kind: MediaKind, discarded: readonly File[]) {
  return `${pluralize(discarded.length, 'Descartado', 'Descartados')} ${discarded.length} ${pluralize(discarded.length, 'archivo que no encaja', 'archivos que no encajan')} en un lote de ${BATCH_NOUN[kind]}: ${listNames(discarded.map((file) => file.name))}. Solo se admiten ${ACCEPTED_FORMATS[kind]}.`
}

type CsvState = { name: string; rows: CarouselCsvRow[] }

/**
 * Carga masiva del carrusel de un caso: archivos de UN tipo (el que elige el
 * admin), CSV opcional con los alt y subida secuencial, una diapositiva tras
 * otra. Misma cola que la carga masiva de pines (`useUploadQueue`); lo propio
 * del carrusel es el alt obligatorio, el orden (por nombre de archivo) y que
 * cada diapositiva guarda su sitio en `sortOrder`.
 */
export function useCarouselBulkUpload({
  contentId,
  items,
}: {
  contentId: string
  items: CarouselItem[]
}) {
  const refresh = useEditorRefresh()

  const [kind, setKind] = useState<MediaKind>('image')
  const [csv, setCsv] = useState<CsvState | null>(null)
  // Nombres de la última selección, antes de quitar filas a mano: el aviso
  // del CSV compara contra lo que se eligió, no contra lo que queda.
  const [selectedNames, setSelectedNames] = useState<string[]>([])
  // Cambia para vaciar el `<input type="file">` al cambiar de tipo.
  const [inputKey, setInputKey] = useState(0)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null)

  const {
    rows,
    setRows,
    updateRow,
    running: uploading,
    run,
  } = useUploadQueue<SlideRow>(rowKey)

  function clearBatch() {
    setRows([])
    setSelectedNames([])
    setFormError(null)
    setSelectionNotice(null)
  }

  // Cambiar de tipo vacía el lote (sus archivos ya no encajarían); el CSV se
  // conserva, que sirve igual para los archivos del otro tipo.
  function selectKind(next: MediaKind) {
    setKind(next)
    clearBatch()
    setInputKey((key) => key + 1)
  }

  // Cada selección sustituye a la anterior, como en la carga masiva de pines.
  function handleFilesChange(fileList: FileList | null) {
    const selected = fileList ? Array.from(fileList) : []
    const accepted = selected.filter((file) => matchesMediaKind(kind, file))
    const discarded = selected.filter((file) => !matchesMediaKind(kind, file))

    setFormError(null)
    setSelectionNotice(
      discarded.length > 0 ? discardedMessage(kind, discarded) : null,
    )
    setSelectedNames(accepted.map((file) => file.name))
    setRows(buildRows(accepted, csv?.rows ?? []))
  }

  async function handleCsvChange(fileList: FileList | null) {
    const csvFile = fileList?.[0]

    if (!csvFile) {
      setCsv(null)
      setRows((current) => applyCsvToRows(current, []))

      return
    }

    const parsed = parseCarouselCsv(await csvFile.text())

    setCsv({ name: csvFile.name, rows: parsed })
    setRows((current) => applyCsvToRows(current, parsed))
  }

  function updateAlt(key: string, alt: string) {
    updateRow(key, { alt, altSource: alt.trim() ? 'manual' : 'none' })
  }

  // Quita una fila del lote antes de subirla. Solo esa: las demás conservan su
  // estado (las ya subidas siguen «Hecho») y lo que el admin haya escrito.
  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key))
    setFormError(null)
  }

  // Sube una imagen y la registra como diapositiva. Lanza si algo falla; el
  // flujo ya descarta de Cloudinary lo subido antes de lanzar el error.
  async function uploadImageRow(row: SlideRow, sortOrder: number) {
    await uploadImageFlow(row.file, {
      beforeUpload: async () => {
        const message = await validateImageSelection(row.file)

        if (message) throw new Error(message)
      },
      register: (image) =>
        addCaseCarouselImageAction({
          contentId,
          cloudinaryPublicId: image.public_id,
          format: image.format,
          width: image.width,
          height: image.height,
          bytes: image.bytes,
          sortOrder,
          alt: row.alt.trim(),
        }),
    })
  }

  // Sube un vídeo y lo registra como diapositiva: 100 MB / 180 s, validado
  // antes con lo que sabe el navegador y después con lo que mide Cloudinary.
  async function uploadVideoRow(row: SlideRow, sortOrder: number) {
    await uploadVideoFlow(row.file, {
      beforeUpload: () => assertLocalVideoWithinLimits(row.file, VIDEO_RULES),
      afterUpload: (video) =>
        assertUploadedVideoWithinLimits(video, VIDEO_RULES),
      register: (video) =>
        addCaseCarouselVideoAction({
          contentId,
          cloudinaryPublicId: video.public_id,
          format: video.format,
          width: video.width,
          height: video.height,
          durationSeconds: video.duration,
          bytes: video.bytes,
          sortOrder,
          alt: row.alt.trim(),
        }),
    })
  }

  async function handleUploadAll() {
    setFormError(null)

    if (rows.length === 0) {
      setFormError('Selecciona al menos un archivo.')

      return
    }

    const pending = rows.filter((row) => row.status !== 'ok')
    const withoutAlt = pending.filter((row) => !row.alt.trim())

    if (withoutAlt.length > 0) {
      setFormError(
        `Falta el alt de ${withoutAlt.length} ${pluralize(withoutAlt.length, 'archivo', 'archivos')} (${listNames(withoutAlt.map((row) => row.file.name))}): no se sube nada hasta completarlo. Escríbelo en la tabla o carga un CSV con la columna alt.`,
      )

      return
    }

    // Una base y un contador para todo el lote: lo que ya hay (`máximo + 1`,
    // no «cuántas hay», que empata tras quitar una) y, a partir de ahí, un
    // número por diapositiva guardada. El contador solo avanza cuando la fila
    // se guarda, así que una que falla no deja hueco. Un reintento recalcula
    // la base y se añade al final.
    let nextOrder = nextCarouselSortOrder(items)

    const summary = await run(async (row) => {
      if (kind === 'video') {
        await uploadVideoRow(row, nextOrder)
      } else {
        await uploadImageRow(row, nextOrder)
      }

      nextOrder += 1
    })

    if (summary.ok > 0) refresh()
  }

  return {
    kind,
    selectKind,
    fileAccept: fileAcceptFor(kind),
    inputKey,
    rows,
    uploading,
    pendingCount: rows.filter((row) => row.status !== 'ok').length,
    formError,
    selectionNotice,
    csvName: csv?.name ?? null,
    csvIssues: csv ? describeCsvIssues(csv.rows, selectedNames) : [],
    okCount: rows.filter((row) => row.status === 'ok').length,
    errorCount: rows.filter((row) => row.status === 'error').length,
    handleFilesChange,
    handleCsvChange,
    updateAlt,
    removeRow,
    handleUploadAll,
  }
}

export type CarouselBulkUpload = ReturnType<typeof useCarouselBulkUpload>
