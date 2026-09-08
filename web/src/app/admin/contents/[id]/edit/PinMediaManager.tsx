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
  pinType: 'fixed' | 'animated' | 'carousel'
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

export default function PinMediaManager({ pinId, pinType, media }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const sortedMedia = [...media].sort((a, b) => a.slideOrder - b.slideOrder)
  const nextSlideOrder = sortedMedia.length

  const canAddImage =
    (pinType === 'fixed' && sortedMedia.length === 0) ||
    (pinType === 'carousel' && sortedMedia.length < 8)

  const canAddVideo = pinType === 'animated' && sortedMedia.length === 0

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
          `La animación no puede superar los ${validation.maxSeconds} segundos.`,
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
      <h4>Medio del pin</h4>

      <div>
        {sortedMedia.map((item) => (
          <MediaThumb
            key={item.id}
            item={item}
            onRemove={() => handleRemove(item)}
          />
        ))}
      </div>

      {(canAddImage || canAddVideo) && (
        <div>
          <input
            type="file"
            accept={pinType === 'animated' ? 'video/*' : 'image/*'}
            disabled={uploading}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />

          {pinType === 'animated' ? (
            <p>Vídeo, máximo 5 s.</p>
          ) : (
            <p>
              Imagen, máximo 5 MB.
              {pinType === 'carousel' && ` (${sortedMedia.length}/8 slides)`}
            </p>
          )}

          <button
            type="button"
            disabled={uploading || !file}
            onClick={canAddVideo ? handleVideoUpload : handleImageUpload}
          >
            {uploading ? 'Subiendo...' : 'Subir'}
          </button>
        </div>
      )}

      {!canAddImage && !canAddVideo && pinType !== 'carousel' && (
        <p>Este pin ya tiene su medio. Quítalo para sustituirlo.</p>
      )}

      {error && <p>{error}</p>}
      {warning && <p>{warning}</p>}
    </div>
  )
}
