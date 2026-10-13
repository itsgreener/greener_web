'use client'

import { useRef, useState } from 'react'

import { closestClosedRatio } from '@/modules/media/domain/closestRatio'

import {
  ratioFromFilename,
  ratioMismatchMessage,
} from '@/modules/media/domain/ratioFromFilename'

import { validateImageSelection } from '@/modules/media/client/validateImageSelection'

import {
  assertLocalVideoWithinLimits,
  assertUploadedVideoWithinLimits,
  contentVideoRules,
} from '@/modules/media/client/videoUploadChecks'

import {
  registerCoverImageAction,
  registerCoverVideoAction,
  deleteCoverMediaAction,
} from '@/app/admin/(panel)/contents/[id]/edit/mediaActions'

import { useCloudinaryUpload } from '@/app/admin/(panel)/contents/[id]/edit/useCloudinaryUpload'
import { useEditorRefresh } from '@/app/admin/(panel)/contents/[id]/edit/useEditorOperation'

import { readImageDimensions, readVideoDimensions } from './readDimensions'
import type {
  CoverMediaUploadProps,
  Dimensions,
  RatioSource,
  RatioValue,
} from './types'

const VIDEO_RULES = contentVideoRules(
  'el archivo subido se ha descartado y la portada anterior no se ha tocado',
)

export function useCoverMediaUpload({
  contentId,
  coverMedia,
}: Pick<CoverMediaUploadProps, 'contentId' | 'coverMedia'>) {
  const upload = useCloudinaryUpload()
  const refresh = useEditorRefresh()

  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<'image' | 'video'>('image')
  const [ratio, setRatio] = useState<RatioValue | ''>('')
  const [ratioSource, setRatioSource] = useState<RatioSource | null>(null)
  const [dimensions, setDimensions] = useState<Dimensions | null>(null)
  // Vacía el <input type="file"> al terminar una subida (la página ya no recarga).
  const [inputKey, setInputKey] = useState(0)

  // Evita que la lectura de dimensiones de un archivo anterior pise la
  // selección actual si el admin cambia de archivo rápido.
  const selectionId = useRef(0)

  // Si el ratio vino del nombre y no encaja con el archivo real, se avisa
  // ANTES de subir (aquí las dimensiones ya se leen al elegir el archivo).
  const filenameMismatch =
    ratioSource === 'filename' && ratio && dimensions
      ? ratioMismatchMessage(
          ratio,
          dimensions.width,
          dimensions.height,
          'filename',
        )
      : null

  function resetRatio() {
    setRatio('')
    setRatioSource(null)
    setDimensions(null)
  }

  function selectKind(next: 'image' | 'video') {
    setKind(next)
    setFile(null)
    upload.setError(null)
    resetRatio()
  }

  function selectFile(selected: File | null) {
    setFile(selected)
    upload.setError(null)
    resetRatio()

    const current = ++selectionId.current

    if (!selected) {
      return
    }

    // El nombre manda si trae una proporción legible; si no, se sugiere la
    // más parecida a las dimensiones reales.
    const fromName = ratioFromFilename(selected.name)

    if (fromName) {
      setRatio(fromName)
      setRatioSource('filename')
    }

    const readDimensions =
      kind === 'video' ? readVideoDimensions : readImageDimensions

    readDimensions(selected)
      .then((read) => {
        if (current !== selectionId.current) return

        setDimensions(read)

        if (!fromName) {
          setRatio(closestClosedRatio(read.width, read.height))
          setRatioSource('dimensions')
        }
      })
      .catch(() => {
        // Sin sugerencia disponible: el admin sigue pudiendo elegir el
        // ratio a mano en el <select>, no bloquea la subida.
      })
  }

  function selectRatio(next: RatioValue | '') {
    setRatio(next)
    setRatioSource('manual')
  }

  function finishUpload() {
    setFile(null)
    resetRatio()
    setInputKey((key) => key + 1)
  }

  // Borra la portada anterior (si la hay) antes de registrar la nueva.
  // Devuelve false si no se pudo: el error ya está en pantalla.
  async function replaceExistingIfAny() {
    if (!coverMedia) {
      return true
    }

    const result = await deleteCoverMediaAction({
      contentId,
      mediaId: coverMedia.id,
      cloudinaryPublicId: coverMedia.cloudinaryPublicId,
      kind: coverMedia.kind,
    })

    if (!result.ok) {
      upload.setError(result.error)

      return false
    }

    if (result.warning) {
      upload.setWarning(result.warning)
    }

    return true
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

    if (!ratio) {
      upload.setError('Selecciona un ratio antes de subir la portada.')

      return
    }

    const uploaded = await upload.uploadImage(file, {
      // Mismo orden que el vídeo: la portada anterior (que se borra de
      // forma permanente) solo se toca cuando la nueva ya está subida.
      afterUpload: () => replaceExistingIfAny(),
      register: (image) =>
        registerCoverImageAction({
          contentId,
          cloudinaryPublicId: image.public_id,
          format: image.format,
          width: image.width,
          height: image.height,
          bytes: image.bytes,
          ratio,
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

    if (!ratio) {
      upload.setError('Selecciona un ratio antes de subir la portada.')

      return
    }

    const uploaded = await upload.uploadVideo(file, {
      beforeUpload: () => assertLocalVideoWithinLimits(file, VIDEO_RULES),
      // OJO: replaceExistingIfAny() BORRA la portada anterior de forma
      // permanente, así que va DESPUÉS de confirmar con el dato real de
      // Cloudinary que el vídeo es válido. Si se borrara antes y el vídeo
      // resultara demasiado largo, el contenido se quedaría sin portada.
      afterUpload: async (video) => {
        assertUploadedVideoWithinLimits(video, VIDEO_RULES)

        return replaceExistingIfAny()
      },
      register: (video) =>
        registerCoverVideoAction({
          contentId,
          cloudinaryPublicId: video.public_id,
          format: video.format,
          width: video.width,
          height: video.height,
          durationSeconds: video.duration,
          bytes: video.bytes,
          ratio,
        }),
    })

    if (!uploaded) return

    finishUpload()
    refresh()
  }

  return {
    coverMedia,
    kind,
    inputKey,
    file,
    ratio,
    ratioSource,
    filenameMismatch,
    uploading: upload.uploading,
    error: upload.error,
    warning: upload.warning,
    selectKind,
    selectFile,
    selectRatio,
    handleUpload: kind === 'video' ? handleVideoUpload : handleImageUpload,
  }
}
