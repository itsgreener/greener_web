'use client'

import { useState } from 'react'

import {
  replaceCaseCarouselImageAction,
  replaceCaseCarouselVideoAction,
  updateCaseCarouselAltAction,
  type EditCaseCarouselActionResult,
} from '@/app/admin/(panel)/contents/[id]/edit/caseCarouselActions'
import {
  uploadImageFlow,
  uploadVideoFlow,
} from '@/app/admin/(panel)/contents/[id]/edit/useCloudinaryUpload'
import type { useEditorOperation } from '@/app/admin/(panel)/contents/[id]/edit/useEditorOperation'
import {
  isAllowedImageFile,
  isVideoFile,
} from '@/modules/media/client/mediaFileKind'
import {
  assertLocalVideoWithinLimits,
  assertUploadedVideoWithinLimits,
  contentVideoRules,
} from '@/modules/media/client/videoUploadChecks'
import { validateImageSelection } from '@/modules/media/client/validateImageSelection'

import type { CarouselItem } from './types'

const VIDEO_RULES = contentVideoRules(
  'el archivo subido se ha descartado y no se ha guardado en el caso',
)

const UNSUPPORTED_FILE_MESSAGE =
  'Formato no admitido. Usa una imagen JPG, PNG, WebP o AVIF (sin GIF ni animaciones) o un vídeo MP4, WebM o MOV.'

const NOTHING_TO_SAVE_MESSAGE =
  'No hay nada que guardar: cambia el alt o elige otro archivo.'

type Feedback = {
  setError: (message: string | null) => void
  setWarning: (message: string | null) => void
}

/**
 * Edición de una diapositiva ya subida: cambiar su alt, sustituir su archivo
 * o ambas cosas. Solo se edita una a la vez. Sin archivo nuevo es una
 * actualización del alt; con archivo, se sube a Cloudinary y el servidor
 * cambia el medio de la misma diapositiva (mismo sitio en el carrusel) y
 * borra el anterior. El tipo del archivo nuevo se detecta solo: una imagen
 * puede pasar a vídeo y al revés.
 */
export function useCarouselSlideEditor({
  contentId,
  sorted,
  operation,
  feedback,
}: {
  contentId: string
  sorted: CarouselItem[]
  operation: ReturnType<typeof useEditorOperation>
  feedback: Feedback
}) {
  const { setError, setWarning } = feedback

  const [editingId, setEditingId] = useState<string | null>(null)
  const [alt, setAlt] = useState('')
  const [file, setFile] = useState<File | null>(null)
  // Cambia para vaciar el `<input type="file">` al abrir otra o al cancelar.
  const [inputKey, setInputKey] = useState(0)

  // Si la diapositiva ya no existe (otra pestaña, refresco), el panel se cierra.
  const editing = sorted.find((item) => item.mediaId === editingId) ?? null

  function reset() {
    setEditingId(null)
    setAlt('')
    setFile(null)
    setInputKey((key) => key + 1)
  }

  function open(item: CarouselItem) {
    setEditingId(item.mediaId)
    setAlt(item.alt)
    setFile(null)
    setInputKey((key) => key + 1)
    setError(null)
    setWarning(null)
  }

  function cancel() {
    reset()
    setError(null)
  }

  function selectFile(selected: File | null) {
    setFile(selected)
    setError(null)
  }

  // Sube el archivo nuevo y lo registra como sustituto. Lanza si algo falla;
  // el flujo ya descarta de Cloudinary lo subido antes de lanzar el error.
  async function replaceMedia(
    item: CarouselItem,
    newFile: File,
    newAlt: string,
  ): Promise<EditCaseCarouselActionResult> {
    let warning: string | undefined

    function capture(result: EditCaseCarouselActionResult) {
      if (result.ok) warning = result.warning

      return result.ok ? ({ ok: true } as const) : result
    }

    if (isVideoFile(newFile)) {
      await uploadVideoFlow(newFile, {
        beforeUpload: () => assertLocalVideoWithinLimits(newFile, VIDEO_RULES),
        afterUpload: (video) =>
          assertUploadedVideoWithinLimits(video, VIDEO_RULES),
        register: async (video) =>
          capture(
            await replaceCaseCarouselVideoAction({
              contentId,
              mediaId: item.mediaId,
              cloudinaryPublicId: video.public_id,
              format: video.format,
              width: video.width,
              height: video.height,
              durationSeconds: video.duration,
              bytes: video.bytes,
              alt: newAlt,
            }),
          ),
      })
    } else {
      await uploadImageFlow(newFile, {
        beforeUpload: async () => {
          const message = await validateImageSelection(newFile)

          if (message) throw new Error(message)
        },
        register: async (image) =>
          capture(
            await replaceCaseCarouselImageAction({
              contentId,
              mediaId: item.mediaId,
              cloudinaryPublicId: image.public_id,
              format: image.format,
              width: image.width,
              height: image.height,
              bytes: image.bytes,
              alt: newAlt,
            }),
          ),
      })
    }

    return { ok: true, warning }
  }

  async function save() {
    if (!editing) return

    const newAlt = alt.trim()

    if (!newAlt) {
      setError('El alt es obligatorio.')

      return
    }

    if (!file && newAlt === editing.alt.trim()) {
      setError(NOTHING_TO_SAVE_MESSAGE)

      return
    }

    if (file && !isVideoFile(file) && !isAllowedImageFile(file)) {
      setError(UNSUPPORTED_FILE_MESSAGE)

      return
    }

    let saved = false

    await operation.run(
      async (): Promise<EditCaseCarouselActionResult> => {
        if (!file) {
          return updateCaseCarouselAltAction({
            contentId,
            mediaId: editing.mediaId,
            alt: newAlt,
          })
        }

        try {
          return await replaceMedia(editing, file, newAlt)
        } catch (flowError) {
          return {
            ok: false,
            error:
              flowError instanceof Error
                ? flowError.message
                : 'No se ha podido sustituir el archivo.',
          }
        }
      },
      (result) => {
        saved = result.ok

        return result.ok ? { warning: result.warning } : { error: result.error }
      },
    )

    if (saved) reset()
  }

  return {
    editing,
    alt,
    setAlt,
    file,
    selectFile,
    inputKey,
    open,
    cancel,
    save,
  }
}

export type CarouselSlideEditor = ReturnType<typeof useCarouselSlideEditor>
