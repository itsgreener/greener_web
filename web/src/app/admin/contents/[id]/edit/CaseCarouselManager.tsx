'use client'

import { useState } from 'react'

import { buildImageUrl } from '@/modules/media/infrastructure/cloudinaryUrl'

import {
  validateImageUpload,
  validateVideoUpload,
} from '@/modules/media/domain/mediaLimits'

import {
  getSignedImageUpload,
  getSignedVideoUpload,
  uploadImageToCloudinary,
  uploadVideoToCloudinary,
} from '@/modules/media/infrastructure/cloudinaryUpload'

import {
  addCaseCarouselImageAction,
  addCaseCarouselVideoAction,
  removeCaseCarouselMediaAction,
} from './caseCarouselActions'

type CarouselItem = {
  mediaId: string
  kind: 'image' | 'video'
  cloudinaryPublicId: string
  sortOrder: number
}

type Props = {
  contentId: string
  items: CarouselItem[]
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

// especificacion-final-formato-detalle.md §3, §6: carrusel de detalle de
// un caso — 1-N imágenes/vídeos mixtos, sin tope (case_detail_media, no
// reutiliza pin_media).
export default function CaseCarouselManager({ contentId, items }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<'image' | 'video'>('image')

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder)
  const nextSortOrder = sorted.length

  async function handleRemove(item: CarouselItem) {
    setError(null)
    setWarning(null)

    const result = await removeCaseCarouselMediaAction({
      contentId,
      mediaId: item.mediaId,
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

      const result = await addCaseCarouselImageAction({
        contentId,
        cloudinaryPublicId: uploaded.public_id,
        format: uploaded.format,
        width: uploaded.width,
        height: uploaded.height,
        bytes: uploaded.bytes,
        sortOrder: nextSortOrder,
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
      const validation = validateVideoUpload(file.size, duration)

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

      const signed = await getSignedVideoUpload()
      const uploaded = await uploadVideoToCloudinary(file, signed)

      const result = await addCaseCarouselVideoAction({
        contentId,
        cloudinaryPublicId: uploaded.public_id,
        format: uploaded.format,
        width: uploaded.width,
        height: uploaded.height,
        durationSeconds: uploaded.duration,
        bytes: uploaded.bytes,
        sortOrder: nextSortOrder,
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
      <h4>Carrusel de detalle ({sorted.length})</h4>

      <div>
        {sorted.map((item) => (
          <div key={item.mediaId}>
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

            <button type="button" onClick={() => handleRemove(item)}>
              Quitar
            </button>
          </div>
        ))}

        {sorted.length === 0 && <p>Todavía no hay carrusel para este caso.</p>}
      </div>

      <label htmlFor="carousel-kind">Tipo de archivo</label>
      <select
        id="carousel-kind"
        value={kind}
        disabled={uploading}
        onChange={(event) => {
          setKind(event.target.value as 'image' | 'video')
          setFile(null)
        }}
      >
        <option value="image">Imagen</option>
        <option value="video">Vídeo</option>
      </select>

      <input
        type="file"
        accept={kind === 'video' ? 'video/*' : 'image/*'}
        disabled={uploading}
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />

      <p>
        {kind === 'video'
          ? 'Vídeo, máximo 100 MB / 180 s.'
          : 'Imagen, máximo 5 MB.'}
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
