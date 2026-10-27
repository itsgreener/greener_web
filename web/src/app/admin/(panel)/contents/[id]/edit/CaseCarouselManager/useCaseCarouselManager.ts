'use client'

import { useState } from 'react'

import { contentVideoRules } from '@/modules/media/client/videoUploadChecks'

import {
  addCaseCarouselImageAction,
  addCaseCarouselVideoAction,
  removeAllCaseCarouselMediaAction,
  removeCaseCarouselMediaAction,
} from '@/app/admin/(panel)/contents/[id]/edit/caseCarouselActions'

import { useMediaUpload } from '@/app/admin/(panel)/contents/[id]/edit/useMediaUpload'

import type { CarouselItem, CaseCarouselManagerProps } from './types'

const VIDEO_RULES = contentVideoRules(
  'el archivo subido se ha descartado y no se ha guardado en el caso',
)

export function useCaseCarouselManager({
  contentId,
  items,
}: CaseCarouselManagerProps) {
  const [removingAll, setRemovingAll] = useState(false)
  const [alt, setAlt] = useState('')

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder)

  const nextSortOrder = sorted.length

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
    videoRules: VIDEO_RULES,
    // Cada diapositiva lleva su alt: sin él no se sube nada.
    precheck: (mediaKind) =>
      alt.trim()
        ? null
        : `El alt es obligatorio antes de subir ${
            mediaKind === 'image' ? 'la imagen' : 'el vídeo'
          }.`,
    registerImage: (image) =>
      addCaseCarouselImageAction({
        contentId,
        cloudinaryPublicId: image.public_id,
        format: image.format,
        width: image.width,
        height: image.height,
        bytes: image.bytes,
        sortOrder: nextSortOrder,
        alt: alt.trim(),
      }),
    registerVideo: (video) =>
      addCaseCarouselVideoAction({
        contentId,
        cloudinaryPublicId: video.public_id,
        format: video.format,
        width: video.width,
        height: video.height,
        durationSeconds: video.duration,
        bytes: video.bytes,
        sortOrder: nextSortOrder,
        alt: alt.trim(),
      }),
    onFinish: () => setAlt(''),
  })

  function handleRemove(item: CarouselItem) {
    return operation.run(
      () =>
        removeCaseCarouselMediaAction({
          contentId,
          mediaId: item.mediaId,
          cloudinaryPublicId: item.cloudinaryPublicId,
          kind: item.kind,
        }),
      (result) =>
        result.ok ? { warning: result.warning } : { error: result.error },
    )
  }

  async function handleRemoveAll() {
    if (
      !window.confirm(
        `¿Quitar las ${sorted.length} diapositivas del carrusel? Se borrarán también sus archivos. Esta acción no se puede deshacer.`,
      )
    ) {
      return
    }

    setRemovingAll(true)

    await operation.run(
      () => removeAllCaseCarouselMediaAction(contentId),
      // Con aviso no se refresca, para que el admin pueda leerlo.
      (result) =>
        result.ok
          ? { warning: result.warning, keepWarningVisible: true }
          : { error: result.error },
    )

    setRemovingAll(false)
  }

  return {
    sorted,
    kind,
    alt,
    setAlt,
    inputKey,
    file,
    uploading: upload.uploading,
    removingAll,
    busy: operation.busy,
    error: upload.error,
    warning: upload.warning,
    selectKind,
    selectFile,
    handleRemove,
    handleRemoveAll,
    handleUpload,
  }
}
