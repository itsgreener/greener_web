'use client'

import { useState } from 'react'

import { pinVideoLimitsFor } from '@/modules/media/domain/mediaLimits'

import {
  closestClosedRatio,
  isPinRatioValue,
  mediaMatchesRatio,
} from '@/modules/media/domain/closestRatio'

import { validateImageSelection } from '@/modules/media/client/validateImageSelection'

import {
  assertLocalVideoWithinLimits,
  assertUploadedVideoWithinLimits,
  pinVideoRules,
} from '@/modules/media/client/videoUploadChecks'

import {
  attachPinImageAction,
  attachPinVideoAction,
  detachPinMediaAction,
} from '@/app/admin/(panel)/contents/[id]/edit/pinActions'

import { useCloudinaryUpload } from '@/app/admin/(panel)/contents/[id]/edit/useCloudinaryUpload'
import {
  useEditorOperation,
  useEditorRefresh,
} from '@/app/admin/(panel)/contents/[id]/edit/useEditorOperation'

import type { PinMedia, PinMediaManagerProps } from './types'

export function usePinMediaManager({
  pinId,
  contentType,
  pinRatio,
  media,
}: PinMediaManagerProps) {
  const videoLimits = pinVideoLimitsFor(contentType)
  const maxVideoMb = videoLimits.maxSizeBytes / 1024 / 1024

  const upload = useCloudinaryUpload()
  const operation = useEditorOperation(upload)
  const refresh = useEditorRefresh()

  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<'image' | 'video'>('image')
  // Cambia al terminar una subida para vaciar el <input type="file">, que
  // la página ya no recarga.
  const [inputKey, setInputKey] = useState(0)

  // Un pin es un único medio: para cambiarlo se quita el actual y se sube otro.
  const canAddMore = media === null

  function selectKind(next: 'image' | 'video') {
    setKind(next)
    setFile(null)
    upload.setError(null)
  }

  function selectFile(selected: File | null) {
    setFile(selected)
    upload.setError(null)
  }

  function finishUpload() {
    setFile(null)
    setInputKey((key) => key + 1)
  }

  function handleRemove(item: PinMedia) {
    return operation.run(
      () =>
        detachPinMediaAction({
          pinId,
          mediaId: item.id,
          cloudinaryPublicId: item.cloudinaryPublicId,
          kind: item.kind,
        }),
      (result) =>
        result.ok ? { warning: result.warning } : { error: result.error },
    )
  }

  async function handleImageUpload() {
    if (!file) {
      upload.setError('Selecciona una imagen.')

      return
    }

    const validationError = await validateImageSelection(file)

    if (validationError) {
      upload.setError(validationError)

      return
    }

    const uploaded = await upload.uploadImage(file, {
      register: (image) =>
        attachPinImageAction({
          pinId,
          cloudinaryPublicId: image.public_id,
          format: image.format,
          width: image.width,
          height: image.height,
          bytes: image.bytes,
        }),
    })

    if (!uploaded) return

    finishUpload()
    refresh()
  }

  async function handleVideoUpload() {
    if (!file) {
      upload.setError('Selecciona un vídeo.')

      return
    }

    const rules = pinVideoRules(contentType)

    const uploaded = await upload.uploadVideo(file, {
      beforeUpload: () => assertLocalVideoWithinLimits(file, rules),
      // Validación real con la duración de Cloudinary — aquí sí importa
      // rechazar con claridad si el vídeo real resulta más largo (o más
      // pesado) de lo permitido para ESTE tipo de pin.
      afterUpload: (video) => assertUploadedVideoWithinLimits(video, rules),
      register: (video) =>
        attachPinVideoAction({
          pinId,
          cloudinaryPublicId: video.public_id,
          format: video.format,
          width: video.width,
          height: video.height,
          durationSeconds: video.duration,
          bytes: video.bytes,
        }),
    })

    if (!uploaded) return

    finishUpload()

    // Los vídeos deben venir en uno de los 7 ratios cerrados, igual que las
    // imágenes. No se bloquea (el vídeo ya está guardado): si su ratio real
    // no es el del pin, se avisa, porque en el feed y en la ficha se
    // recortará con `object-fit: cover`.
    if (
      isPinRatioValue(pinRatio) &&
      !mediaMatchesRatio(uploaded.width, uploaded.height, pinRatio)
    ) {
      const suggested = closestClosedRatio(uploaded.width, uploaded.height)

      upload.setWarning(
        `El vídeo se ha guardado, pero su ratio real (${uploaded.width}×${uploaded.height}, parecido a ${suggested}) no es el del pin (${pinRatio}) y se verá recortado. Cambia el ratio del pin a ${suggested} o sustituye el vídeo por uno en ${pinRatio}.`,
      )
    }

    refresh()
  }

  return {
    media,
    kind,
    inputKey,
    file,
    uploading: upload.uploading,
    error: upload.error,
    warning: upload.warning,
    canAddMore,
    videoLimits,
    maxVideoMb,
    contentType,
    selectKind,
    selectFile,
    handleRemove,
    handleUpload: kind === 'video' ? handleVideoUpload : handleImageUpload,
  }
}
