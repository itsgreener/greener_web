'use client'

import { pinVideoLimitsFor } from '@/modules/media/domain/mediaLimits'

import {
  closestClosedRatio,
  isPinRatioValue,
  mediaMatchesRatio,
} from '@/modules/media/domain/closestRatio'

import { pinVideoRules } from '@/modules/media/client/videoUploadChecks'

import {
  attachPinImageAction,
  attachPinVideoAction,
  detachPinMediaAction,
} from '@/app/admin/(panel)/contents/[id]/edit/pinActions'

import { useMediaUpload } from '@/app/admin/(panel)/contents/[id]/edit/useMediaUpload'

import type { PinMedia, PinMediaManagerProps } from './types'

export function usePinMediaManager({
  pinId,
  contentType,
  pinRatio,
  media,
}: PinMediaManagerProps) {
  const videoLimits = pinVideoLimitsFor(contentType)
  const maxVideoMb = videoLimits.maxSizeBytes / 1024 / 1024

  const {
    upload,
    operation,
    file,
    kind,
    inputKey,
    selectKind,
    selectFile,
    handleUpload,
  } = useMediaUpload({
    videoRules: pinVideoRules(contentType),
    registerImage: (image) =>
      attachPinImageAction({
        pinId,
        cloudinaryPublicId: image.public_id,
        format: image.format,
        width: image.width,
        height: image.height,
        bytes: image.bytes,
      }),
    registerVideo: (video) =>
      attachPinVideoAction({
        pinId,
        cloudinaryPublicId: video.public_id,
        format: video.format,
        width: video.width,
        height: video.height,
        durationSeconds: video.duration,
        bytes: video.bytes,
      }),
    // Los vídeos deben venir en uno de los 7 ratios cerrados, igual que las
    // imágenes. No se bloquea (el vídeo ya está guardado): si su ratio real
    // no es el del pin, se avisa, porque en el feed y en la ficha se
    // recortará con `object-fit: cover`.
    onVideoUploaded: (uploaded, setWarning) => {
      if (
        isPinRatioValue(pinRatio) &&
        !mediaMatchesRatio(uploaded.width, uploaded.height, pinRatio)
      ) {
        const suggested = closestClosedRatio(uploaded.width, uploaded.height)

        setWarning(
          `El vídeo se ha guardado, pero su ratio real (${uploaded.width}×${uploaded.height}, parecido a ${suggested}) no es el del pin (${pinRatio}) y se verá recortado. Cambia el ratio del pin a ${suggested} o sustituye el vídeo por uno en ${pinRatio}.`,
        )
      }
    },
  })

  // Un pin es un único medio: para cambiarlo se quita el actual y se sube otro.
  const canAddMore = media === null

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
    handleUpload,
  }
}
