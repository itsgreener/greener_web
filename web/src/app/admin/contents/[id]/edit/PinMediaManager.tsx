'use client'

import { useState } from 'react'

import { buildImageUrl } from '@/modules/media/infrastructure/cloudinaryUrl'

import {
  validateImageUpload,
  validatePinAnimationUpload,
} from '@/modules/media/domain/mediaLimits'

import {
  getSignedImageUpload,
  getSignedVideoUpload,
  uploadImageToCloudinary,
  uploadVideoToCloudinary,
} from '@/modules/media/infrastructure/cloudinaryUpload'

import {
  attachPinImageAction,
  attachPinVideoAction,
  detachPinMediaAction,
} from './pinActions'

type PinMedia = {
  id: string
  kind: 'image' | 'video'
  cloudinaryPublicId: string
  slideOrder: number
}

type Props = {
  pinId: string
  media: PinMedia[]
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('No se ha podido leer la duración del vídeo.'))
    }

    video.src = URL.createObjectURL(file)
  })
}

function MediaThumb({
  item,
  onRemove,
}: {
  item: PinMedia
  onRemove: () => void
}) {
  return (
    <div>
      {item.kind === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={buildImageUrl(item.cloudinaryPublicId, 'feed', 200)}
          alt=""
          width={100}
          height={100}
        />
      ) : (
        <p>{item.cloudinaryPublicId} (vídeo)</p>
      )}

      <button type="button" onClick={onRemove}>
        Quitar
      </button>
    </div>
  )
}

// especificacion-final-formato-detalle.md §3, §6: pin_type desaparece —
// cualquier pin admite de 1 a 8 medios mixtos (imagen o vídeo ≤5 s), sin
// distinción de tipo. show_as_carousel (gestionado en PinList/EditPinForm)
// decide cómo se muestra en el feed, no qué se puede subir aquí.
export default function PinMediaManager({ pinId, media }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<'image' | 'video'>('image')

  const sortedMedia = [...media].sort((a, b) => a.slideOrder - b.slideOrder)
  const nextSlideOrder = sortedMedia.length
  const canAddMore = sortedMedia.length < 8

  async function handleRemove(item: PinMedia) {
    setError(null)
    setWarning(null)

    const result = await detachPinMediaAction({
      pinId,
      mediaId: item.id,
      cloudinaryPublicId: item.cloudinaryPublicId,
      kind: item.kind,
    })

    if (!result.ok) {
      setError(result.error)
      return
    }

    if (result.warning) {
      setWarning(result.warning)
    }

    window.location.reload()
  }

  async function handleImageUpload() {
    if (!file) {
      setError('Selecciona una imagen.')
      return
    }

    const validation = validateImageUpload(file.size)

    if (validation && validation.code === 'IMAGE_TOO_LARGE') {
      setError(
        `La imagen supera el límite de ${validation.maxBytes / 1024 / 1024} MB.`,
      )
      return
    }

    setUploading(true)
    setError(null)
    setWarning(null)

    try {
      const signed = await getSignedImageUpload()
      const uploaded = await uploadImageToCloudinary(file, signed)

      const result = await attachPinImageAction({
        pinId,
        cloudinaryPublicId: uploaded.public_id,
        format: uploaded.format,
        width: uploaded.width,
        height: uploaded.height,
        bytes: uploaded.bytes,
        slideOrder: nextSlideOrder,
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      setFile(null)
      window.location.reload()
    } catch (uploadError) {
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

    setUploading(true)
    setError(null)
    setWarning(null)

    try {
      const duration = await readVideoDuration(file)

      const validation = validatePinAnimationUpload(file.size, duration)

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

      const signed = await getSignedVideoUpload()
      const uploaded = await uploadVideoToCloudinary(file, signed)

      const result = await attachPinVideoAction({
        pinId,
        cloudinaryPublicId: uploaded.public_id,
        format: uploaded.format,
        width: uploaded.width,
        height: uploaded.height,
        durationSeconds: uploaded.duration,
        bytes: uploaded.bytes,
        slideOrder: nextSlideOrder,
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      setFile(null)
      window.location.reload()
    } catch (uploadError) {
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
      <h4>Medios del pin ({sortedMedia.length}/8)</h4>

      <div>
        {sortedMedia.map((item) => (
          <MediaThumb
            key={item.id}
            item={item}
            onRemove={() => handleRemove(item)}
          />
        ))}
      </div>

      {canAddMore && (
        <div>
          <label htmlFor="pin-media-kind">Tipo de archivo</label>
          <select
            id="pin-media-kind"
            value={kind}
            disabled={uploading}
            onChange={(event) => {
              setKind(event.target.value as 'image' | 'video')
              setFile(null)
            }}
          >
            <option value="image">Imagen</option>
            <option value="video">Vídeo (máx. 5 s)</option>
          </select>

          <input
            type="file"
            accept={kind === 'video' ? 'video/*' : 'image/*'}
            disabled={uploading}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />

          {kind === 'video' ? (
            <p>Vídeo, máximo 5 s.</p>
          ) : (
            <p>Imagen, máximo 5 MB.</p>
          )}

          <button
            type="button"
            disabled={uploading || !file}
            onClick={kind === 'video' ? handleVideoUpload : handleImageUpload}
          >
            {uploading ? 'Subiendo...' : 'Subir'}
          </button>
        </div>
      )}

      {!canAddMore && <p>Este pin ya tiene 8 medios, el máximo permitido.</p>}

      {error && <p>{error}</p>}
      {warning && <p>{warning}</p>}
    </div>
  )
}
