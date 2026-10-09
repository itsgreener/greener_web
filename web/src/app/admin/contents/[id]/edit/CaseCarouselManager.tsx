'use client'

import { useState } from 'react'

import { buildImageUrl } from '@/modules/media/infrastructure/cloudinaryUrl'
import { ADMIN_THUMBNAIL_WIDTH } from '@/modules/media/domain/mediaDelivery'

import {
  VIDEO_LIMITS,
  validateVideoUpload,
} from '@/modules/media/domain/mediaLimits'

import {
  IMAGE_FILE_ACCEPT,
  validateImageSelection,
} from '@/modules/media/application/validateImageSelection'

import {
  getSignedImageUpload,
  getSignedVideoUpload,
  uploadImageToCloudinary,
  uploadVideoToCloudinary,
} from '@/modules/media/infrastructure/cloudinaryUpload'

import { readLocalVideoDuration } from '@/modules/media/infrastructure/readLocalVideoDuration'

import {
  addCaseCarouselImageAction,
  addCaseCarouselVideoAction,
  removeAllCaseCarouselMediaAction,
  removeCaseCarouselMediaAction,
} from './caseCarouselActions'

import { acquireEditorLock, useEditorBusy } from './editorLock'

import { discardUploadQuietly, type UploadedAssetRef } from './discardUpload'

type CarouselItem = {
  mediaId: string
  kind: 'image' | 'video'
  cloudinaryPublicId: string
  sortOrder: number
  alt: string
}

type Props = {
  contentId: string
  items: CarouselItem[]
}

export default function CaseCarouselManager({ contentId, items }: Props) {
  const [uploading, setUploading] = useState(false)

  const [removingAll, setRemovingAll] = useState(false)

  const busy = useEditorBusy()

  const [error, setError] = useState<string | null>(null)

  const [warning, setWarning] = useState<string | null>(null)

  const [file, setFile] = useState<File | null>(null)

  const [kind, setKind] = useState<'image' | 'video'>('image')

  const [alt, setAlt] = useState('')

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder)

  const nextSortOrder = sorted.length

  async function handleRemove(item: CarouselItem) {
    const release = acquireEditorLock()

    setError(null)
    setWarning(null)

    let result: Awaited<ReturnType<typeof removeCaseCarouselMediaAction>>

    try {
      result = await removeCaseCarouselMediaAction({
        contentId,

        mediaId: item.mediaId,

        cloudinaryPublicId: item.cloudinaryPublicId,

        kind: item.kind,
      })
    } catch (actionError) {
      console.error(actionError)
      setError('No se ha podido completar la operación.')
      release()

      return
    }

    if (!result.ok) {
      setError(result.error)
      release()

      return
    }

    if (result.warning) {
      setWarning(result.warning)
    }

    window.location.reload()
  }

  async function handleRemoveAll() {
    if (
      !window.confirm(
        `¿Quitar las ${sorted.length} diapositivas del carrusel? Se borrarán también sus archivos. Esta acción no se puede deshacer.`,
      )
    ) {
      return
    }

    const release = acquireEditorLock()

    setRemovingAll(true)
    setError(null)
    setWarning(null)

    let result: Awaited<ReturnType<typeof removeAllCaseCarouselMediaAction>>

    try {
      result = await removeAllCaseCarouselMediaAction(contentId)
    } catch (actionError) {
      console.error(actionError)
      setError('No se ha podido completar la operación.')
      setRemovingAll(false)
      release()

      return
    }

    if (!result.ok) {
      setError(result.error)
      setRemovingAll(false)
      release()

      return
    }

    if (result.warning) {
      setWarning(result.warning)
      setRemovingAll(false)
      release()

      return
    }

    window.location.reload()
  }

  async function handleImageUpload() {
    if (!file) {
      setError('Selecciona una imagen.')

      return
    }

    if (!alt.trim()) {
      setError('El alt es obligatorio antes de subir la imagen.')

      return
    }

    const validationError = await validateImageSelection(file)

    if (validationError) {
      setError(validationError)

      return
    }

    setUploading(true)
    setError(null)
    setWarning(null)

    let uploadedAsset: UploadedAssetRef | null = null

    try {
      const signed = await getSignedImageUpload()

      const uploaded = await uploadImageToCloudinary(file, signed)

      uploadedAsset = { publicId: uploaded.public_id, kind: 'image' }

      const result = await addCaseCarouselImageAction({
        contentId,

        cloudinaryPublicId: uploaded.public_id,

        format: uploaded.format,

        width: uploaded.width,

        height: uploaded.height,

        bytes: uploaded.bytes,

        sortOrder: nextSortOrder,

        alt: alt.trim(),
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      setFile(null)
      setAlt('')

      window.location.reload()
    } catch (uploadError) {
      await discardUploadQuietly(uploadedAsset)

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'No se ha podido subir la imagen.',
      )
    } finally {
      setUploading(false)
    }
  }

  async function handleVideoUpload() {
    if (!file) {
      setError('Selecciona un vídeo.')

      return
    }

    if (!alt.trim()) {
      setError('El alt es obligatorio antes de subir el vídeo.')

      return
    }

    setUploading(true)
    setError(null)
    setWarning(null)

    let uploadedAsset: UploadedAssetRef | null = null

    try {
      // Parche urgente (30 sep): leer la duración en el propio navegador
      // falla con bastantes vídeos perfectamente válidos — sobre todo
      // .mov/HEVC, el formato por defecto al grabar en muchos móviles,
      // que Chrome/Firefox en varios sistemas no saben decodificar aunque
      // Cloudinary lo acepta sin problema. Antes, ese fallo bloqueaba la
      // subida entera con "No se ha podido leer la duración del vídeo."
      // Ahora: si el navegador no puede leerla, no se bloquea aquí — se
      // valida solo el tamaño (que no necesita decodificar nada) y se
      // sube. La duración real, la que de verdad importa, se valida más
      // abajo con el dato que devuelve Cloudinary tras la subida — que es
      // la fuente de verdad, no una lectura local best-effort.
      // `null` = el navegador no ha podido dar una duración fiable (vídeo
      // no decodificable, duración `Infinity`/`NaN` de un WebM sin cabecera,
      // o sin respuesta a tiempo): no se bloquea aquí, se valida después con
      // la duración real de Cloudinary. Ver readLocalVideoDuration.
      const localDuration = await readLocalVideoDuration(file)

      if (localDuration !== null) {
        const validation = validateVideoUpload(file.size, localDuration)

        if (validation?.code === 'VIDEO_TOO_LONG') {
          throw new Error(
            `El vídeo no puede superar los ${validation.maxSeconds} segundos.`,
          )
        }

        if (validation?.code === 'VIDEO_TOO_LARGE') {
          throw new Error(
            `El vídeo supera los ${validation.maxBytes / 1024 / 1024} MB.`,
          )
        }
      } else if (file.size > VIDEO_LIMITS.maxSizeBytes) {
        throw new Error(
          `El vídeo supera los ${VIDEO_LIMITS.maxSizeBytes / 1024 / 1024} MB.`,
        )
      }

      const signed = await getSignedVideoUpload()

      const uploaded = await uploadVideoToCloudinary(file, signed)

      uploadedAsset = { publicId: uploaded.public_id, kind: 'video' }

      // Validación real, con la duración que ha calculado Cloudinary — no
      // la del navegador. Cubre tanto el caso en que no se pudo leer en
      // local como, por prudencia, el caso en que sí se pudo (para que la
      // comprobación final sea siempre la misma, autoritativa).
      const finalValidation = validateVideoUpload(
        uploaded.bytes,
        uploaded.duration,
      )

      if (finalValidation?.code === 'VIDEO_TOO_LONG') {
        throw new Error(
          `El vídeo dura más de los ${finalValidation.maxSeconds} segundos permitidos (el archivo subido se ha descartado y no se ha guardado en el caso).`,
        )
      }

      if (finalValidation?.code === 'VIDEO_TOO_LARGE') {
        throw new Error(
          `El vídeo supera los ${finalValidation.maxBytes / 1024 / 1024} MB (el archivo subido se ha descartado y no se ha guardado en el caso).`,
        )
      }

      const result = await addCaseCarouselVideoAction({
        contentId,

        cloudinaryPublicId: uploaded.public_id,

        format: uploaded.format,

        width: uploaded.width,

        height: uploaded.height,

        durationSeconds: uploaded.duration,

        bytes: uploaded.bytes,

        sortOrder: nextSortOrder,

        alt: alt.trim(),
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      setFile(null)
      setAlt('')

      window.location.reload()
    } catch (uploadError) {
      await discardUploadQuietly(uploadedAsset)

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'No se ha podido subir el vídeo.',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <h4>Carrusel de detalle ({sorted.length})</h4>

      <div>
        {sorted.map((item) => (
          <div key={item.mediaId}>
            {item.kind === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={buildImageUrl(
                  item.cloudinaryPublicId,
                  'feed',
                  ADMIN_THUMBNAIL_WIDTH,
                )}
                alt={item.alt}
                width={100}
                height={100}
              />
            ) : (
              <p>{item.cloudinaryPublicId} (vídeo)</p>
            )}

            <p>{item.alt}</p>

            <button
              type="button"
              disabled={busy || uploading}
              onClick={() => handleRemove(item)}
            >
              Quitar
            </button>
          </div>
        ))}

        {sorted.length === 0 && <p>Todavía no hay carrusel para este caso.</p>}
      </div>

      {sorted.length > 0 && (
        <button
          type="button"
          disabled={removingAll || uploading || busy}
          onClick={handleRemoveAll}
        >
          {removingAll
            ? 'Quitando...'
            : `Quitar todas las diapositivas (${sorted.length})`}
        </button>
      )}

      <label htmlFor="carousel-alt">Alt (obligatorio)</label>

      <input
        id="carousel-alt"
        type="text"
        value={alt}
        disabled={uploading}
        onChange={(event) => setAlt(event.target.value)}
      />

      <label htmlFor="carousel-kind">Tipo de archivo</label>

      <select
        id="carousel-kind"
        value={kind}
        disabled={uploading}
        onChange={(event) => {
          setKind(event.target.value as 'image' | 'video')

          setFile(null)
          setError(null)
        }}
      >
        <option value="image">Imagen</option>

        <option value="video">Vídeo</option>
      </select>

      <input
        type="file"
        accept={kind === 'video' ? 'video/*' : IMAGE_FILE_ACCEPT}
        disabled={uploading}
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null)

          setError(null)
        }}
      />

      <p>
        {kind === 'video'
          ? 'Vídeo, máximo 100 MB / 180 s.'
          : 'JPG, PNG, WebP o AVIF. Máximo 5 MB. Sin animaciones.'}
      </p>

      <button
        type="button"
        disabled={uploading || !file}
        onClick={kind === 'video' ? handleVideoUpload : handleImageUpload}
      >
        {uploading ? 'Subiendo...' : 'Añadir al carrusel'}
      </button>

      {error && <p>{error}</p>}

      {warning && <p>{warning}</p>}
    </div>
  )
}
