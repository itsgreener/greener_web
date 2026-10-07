'use client'

import { useState } from 'react'

import { buildImageUrl } from '@/modules/media/infrastructure/cloudinaryUrl'
import { ADMIN_THUMBNAIL_WIDTH } from '@/modules/media/domain/mediaDelivery'

import {
  pinVideoLimitsFor,
  validatePinVideoUpload,
} from '@/modules/media/domain/mediaLimits'

import {
  closestClosedRatio,
  isPinRatioValue,
  mediaMatchesRatio,
} from '@/modules/media/domain/closestRatio'

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
  attachPinImageAction,
  attachPinVideoAction,
  detachPinMediaAction,
} from './pinActions'

import { discardUploadQuietly, type UploadedAssetRef } from './discardUpload'

type PinMedia = {
  id: string
  kind: 'image' | 'video'
  cloudinaryPublicId: string
  slideOrder: number
}

type Props = {
  pinId: string
  // Tipo del contenido al que pertenece el pin: decide el límite de vídeo
  // (tools: 15 s / 15 MB; el resto: 8 s / 100 MB).
  contentType: string
  // Ratio cerrado del pin, para avisar si el vídeo subido tiene otro.
  pinRatio: string
  media: PinMedia[]
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
          src={buildImageUrl(
            item.cloudinaryPublicId,
            'feed',
            ADMIN_THUMBNAIL_WIDTH,
          )}
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

export default function PinMediaManager({
  pinId,
  contentType,
  pinRatio,
  media,
}: Props) {
  const videoLimits = pinVideoLimitsFor(contentType)
  const maxVideoMb = videoLimits.maxSizeBytes / 1024 / 1024

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

    setUploading(true)
    setError(null)
    setWarning(null)

    let uploadedAsset: UploadedAssetRef | null = null

    try {
      // Mismo parche urgente que CaseCarouselManager.tsx (30 sep): si el
      // navegador no puede leer la duración localmente (típico con
      // .mov/HEVC), no se bloquea aquí — se valida solo el tamaño y se
      // sube. La duración real se valida después con el dato de
      // Cloudinary, la fuente de verdad.
      // `null` = el navegador no ha podido dar una duración fiable (vídeo
      // no decodificable, duración `Infinity`/`NaN` de un WebM sin cabecera,
      // o sin respuesta a tiempo): no se bloquea aquí, se valida después con
      // la duración real de Cloudinary. Ver readLocalVideoDuration.
      const localDuration = await readLocalVideoDuration(file)

      if (localDuration !== null) {
        const validation = validatePinVideoUpload(
          contentType,
          file.size,
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
      } else if (file.size > videoLimits.maxSizeBytes) {
        throw new Error(`El vídeo supera los ${maxVideoMb} MB.`)
      }

      const signed = await getSignedVideoUpload()

      const uploaded = await uploadVideoToCloudinary(file, signed)

      uploadedAsset = { publicId: uploaded.public_id, kind: 'video' }

      // Validación real con la duración de Cloudinary — aquí sí importa
      // rechazar con claridad si el vídeo real resulta más largo (o más
      // pesado) de lo permitido para ESTE tipo de pin.
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

      // Los vídeos deben venir en uno de los 7 ratios cerrados, igual que
      // las imágenes. No se bloquea (el vídeo ya está guardado): si su
      // ratio real no es el del pin, se avisa, porque en el feed y en la
      // ficha se recortará con `object-fit: cover`. En ese caso no se
      // recarga sola la página para que el aviso se pueda leer.
      if (
        isPinRatioValue(pinRatio) &&
        !mediaMatchesRatio(uploaded.width, uploaded.height, pinRatio)
      ) {
        const suggested = closestClosedRatio(uploaded.width, uploaded.height)

        setWarning(
          `El vídeo se ha guardado, pero su ratio real (${uploaded.width}×${uploaded.height}, parecido a ${suggested}) no es el del pin (${pinRatio}) y se verá recortado. Cambia el ratio del pin a ${suggested} o sustituye el vídeo por uno en ${pinRatio}. Recarga la página para ver la lista actualizada.`,
        )

        return
      }

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
              setError(null)
            }}
          >
            <option value="image">Imagen</option>

            <option value="video">
              Vídeo (máx. {videoLimits.maxDurationSeconds} s)
            </option>
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

          {kind === 'video' ? (
            <p>
              Vídeo MP4, WebM o MOV, máximo {videoLimits.maxDurationSeconds} s y{' '}
              {maxVideoMb} MB, en uno de los 7 ratios (1:1, 4:3, 4:5, 3:4, 2:3,
              9:16, 16:9).
              {contentType === 'tool'
                ? ' Por encima de 8 s, en el feed solo se verá el poster; el vídeo completo se ve en la ficha de la tool.'
                : ''}
            </p>
          ) : (
            <p>JPG, PNG, WebP o AVIF. Máximo 5 MB. Sin animaciones.</p>
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
