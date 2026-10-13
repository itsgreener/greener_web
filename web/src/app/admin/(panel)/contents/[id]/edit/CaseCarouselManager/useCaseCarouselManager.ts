'use client'

import { useState } from 'react'

import { validateImageSelection } from '@/modules/media/client/validateImageSelection'

import {
  assertLocalVideoWithinLimits,
  assertUploadedVideoWithinLimits,
  contentVideoRules,
} from '@/modules/media/client/videoUploadChecks'

import {
  addCaseCarouselImageAction,
  addCaseCarouselVideoAction,
  removeAllCaseCarouselMediaAction,
  removeCaseCarouselMediaAction,
} from '@/app/admin/(panel)/contents/[id]/edit/caseCarouselActions'

import { useCloudinaryUpload } from '@/app/admin/(panel)/contents/[id]/edit/useCloudinaryUpload'
import {
  useEditorOperation,
  useEditorRefresh,
} from '@/app/admin/(panel)/contents/[id]/edit/useEditorOperation'

import type { CarouselItem, CaseCarouselManagerProps } from './types'

const VIDEO_RULES = contentVideoRules(
  'el archivo subido se ha descartado y no se ha guardado en el caso',
)

export function useCaseCarouselManager({
  contentId,
  items,
}: CaseCarouselManagerProps) {
  const upload = useCloudinaryUpload()
  const operation = useEditorOperation(upload)
  const refresh = useEditorRefresh()

  const [removingAll, setRemovingAll] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<'image' | 'video'>('image')
  const [alt, setAlt] = useState('')
  // Vacía el <input type="file"> al terminar una subida (la página ya no recarga).
  const [inputKey, setInputKey] = useState(0)

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder)

  const nextSortOrder = sorted.length

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
    setAlt('')
    setInputKey((key) => key + 1)
  }

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

  async function handleImageUpload() {
    if (!file) {
      upload.setError('Selecciona una imagen.')

      return
    }

    if (!alt.trim()) {
      upload.setError('El alt es obligatorio antes de subir la imagen.')

      return
    }

    const validationError = await validateImageSelection(file)

    if (validationError) {
      upload.setError(validationError)

      return
    }

    const uploaded = await upload.uploadImage(file, {
      register: (image) =>
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

    if (!alt.trim()) {
      upload.setError('El alt es obligatorio antes de subir el vídeo.')

      return
    }

    const uploaded = await upload.uploadVideo(file, {
      beforeUpload: () => assertLocalVideoWithinLimits(file, VIDEO_RULES),
      // Validación real, con la duración que ha calculado Cloudinary — no
      // la del navegador.
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
          sortOrder: nextSortOrder,
          alt: alt.trim(),
        }),
    })

    if (!uploaded) return

    finishUpload()
    refresh()
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
    handleUpload: kind === 'video' ? handleVideoUpload : handleImageUpload,
  }
}
