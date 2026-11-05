'use client'

import { useState } from 'react'

import { validateImageSelection } from '@/modules/media/client/validateImageSelection'
import {
  assertLocalVideoWithinLimits,
  assertUploadedVideoWithinLimits,
  type VideoRules,
} from '@/modules/media/client/videoUploadChecks'
import type {
  CloudinaryImageResult,
  CloudinaryVideoResult,
} from '@/modules/media/client/cloudinaryUpload'
import type { MediaKind } from '@/modules/shared/domain/mediaKind'

import { useCloudinaryUpload, type RegisterResult } from './useCloudinaryUpload'
import { useEditorOperation, useEditorRefresh } from './useEditorOperation'

type Options = {
  /** Reglas de duración y tamaño de los vídeos de este gestor. */
  videoRules: VideoRules
  /**
   * Comprobación previa a subir, con el archivo ya elegido: devuelve el
   * mensaje de error o `null` si todo está bien (el alt del carrusel).
   */
  precheck?: (kind: MediaKind) => string | null
  /** Guarda la imagen subida en la base de datos. */
  registerImage: (image: CloudinaryImageResult) => Promise<RegisterResult>
  /** Guarda el vídeo subido en la base de datos. */
  registerVideo: (video: CloudinaryVideoResult) => Promise<RegisterResult>
  /**
   * Tras guardar un vídeo y antes de refrescar. Recibe `setWarning` para
   * avisar sin bloquear (el ratio real no es el del pin).
   */
  onVideoUploaded?: (
    video: CloudinaryVideoResult,
    setWarning: (message: string | null) => void,
  ) => void
  /** Al terminar una subida, además de vaciar el archivo (el alt del carrusel). */
  onFinish?: () => void
}

/**
 * Lógica común de los gestores de medios del editor (pin y carrusel): el
 * archivo y el tipo elegidos, el `<input>` que se vacía al terminar, y los
 * dos flujos «comprobar → subir → registrar → refrescar». Cada gestor solo
 * dice qué registra y qué comprueba de más. Conserva el orden de
 * `useCloudinaryUpload`: subir, registrar y, si algo falla después de subir,
 * descartar el archivo.
 */
export function useMediaUpload({
  videoRules,
  precheck,
  registerImage,
  registerVideo,
  onVideoUploaded,
  onFinish,
}: Options) {
  const upload = useCloudinaryUpload()
  const operation = useEditorOperation(upload)
  const refresh = useEditorRefresh()

  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<MediaKind>('image')
  // Cambia al terminar una subida para vaciar el <input type="file">, que
  // la página ya no recarga.
  const [inputKey, setInputKey] = useState(0)

  function selectKind(next: MediaKind) {
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
    onFinish?.()
    setInputKey((key) => key + 1)
  }

  async function handleImageUpload() {
    if (!file) {
      upload.setError('Selecciona una imagen.')

      return
    }

    const precheckError = precheck?.('image')

    if (precheckError) {
      upload.setError(precheckError)

      return
    }

    const validationError = await validateImageSelection(file)

    if (validationError) {
      upload.setError(validationError)

      return
    }

    const uploaded = await upload.uploadImage(file, {
      register: registerImage,
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

    const precheckError = precheck?.('video')

    if (precheckError) {
      upload.setError(precheckError)

      return
    }

    const uploaded = await upload.uploadVideo(file, {
      beforeUpload: () => assertLocalVideoWithinLimits(file, videoRules),
      // Validación real con la duración de Cloudinary, no la del navegador:
      // aquí sí importa rechazar con claridad si el vídeo real resulta más
      // largo (o más pesado) de lo permitido.
      afterUpload: (video) =>
        assertUploadedVideoWithinLimits(video, videoRules),
      register: registerVideo,
    })

    if (!uploaded) return

    finishUpload()
    onVideoUploaded?.(uploaded, upload.setWarning)
    refresh()
  }

  return {
    upload,
    operation,
    file,
    kind,
    inputKey,
    selectKind,
    selectFile,
    handleUpload: kind === 'video' ? handleVideoUpload : handleImageUpload,
  }
}
