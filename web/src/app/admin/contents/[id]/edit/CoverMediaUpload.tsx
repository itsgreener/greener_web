'use client'

import {
  useState,
} from 'react'

import {
  buildImageUrl,
} from '@/modules/media/infrastructure/cloudinaryUrl'

import {
  validateVideoUpload,
} from '@/modules/media/domain/mediaLimits'

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

import {
  registerCoverImageAction,
  registerCoverVideoAction,
  deleteCoverMediaAction,
} from './mediaActions'

type CoverMedia = {
  id: string
  kind: 'image' | 'video'
  cloudinaryPublicId: string
}

type Props = {
  contentId: string
  allowVideo: boolean

  coverMedia:
    CoverMedia | null
}

function readVideoDuration(
  file: File
): Promise<number> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const video =
        document
          .createElement(
            'video'
          )

      video.preload =
        'metadata'

      video.onloadedmetadata =
        () => {
          URL
            .revokeObjectURL(
              video.src
            )

          resolve(
            video.duration
          )
        }

      video.onerror =
        () => {
          URL
            .revokeObjectURL(
              video.src
            )

          reject(
            new Error(
              'No se ha podido leer la duración del vídeo.'
            )
          )
        }

      video.src =
        URL
          .createObjectURL(
            file
          )
    }
  )
}

export default function CoverMediaUpload({
  contentId,
  allowVideo,
  coverMedia,
}: Props) {
  const [
    uploading,
    setUploading,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null)

  const [
    warning,
    setWarning,
  ] =
    useState<
      string | null
    >(null)

  const [
    file,
    setFile,
  ] =
    useState<
      File | null
    >(null)

  const [
    kind,
    setKind,
  ] =
    useState<
      'image' | 'video'
    >('image')

  async function replaceExistingIfAny() {
    if (!coverMedia) {
      return true
    }

    const result =
      await deleteCoverMediaAction({
        contentId,

        mediaId:
          coverMedia.id,

        cloudinaryPublicId:
          coverMedia
            .cloudinaryPublicId,

        kind:
          coverMedia.kind,
      })

    if (!result.ok) {
      setError(
        result.error
      )

      return false
    }

    if (
      result.warning
    ) {
      setWarning(
        result.warning
      )
    }

    return true
  }

  async function handleImageUpload() {
    if (!file) {
      setError(
        'Selecciona una imagen.'
      )

      return
    }

    const validationError =
      await validateImageSelection(
        file
      )

    if (
      validationError
    ) {
      setError(
        validationError
      )

      return
    }

    setUploading(true)
    setError(null)
    setWarning(null)

    try {
      const replaced =
        await replaceExistingIfAny()

      if (!replaced) {
        return
      }

      const signed =
        await getSignedImageUpload()

      const uploaded =
        await uploadImageToCloudinary(
          file,
          signed
        )

      const result =
        await registerCoverImageAction({
          contentId,

          cloudinaryPublicId:
            uploaded.public_id,

          format:
            uploaded.format,

          width:
            uploaded.width,

          height:
            uploaded.height,

          bytes:
            uploaded.bytes,
        })

      if (!result.ok) {
        throw new Error(
          result.error
        )
      }

      setFile(null)

      window
        .location
        .reload()

    } catch (
      uploadError
    ) {
      setError(
        uploadError
          instanceof Error
          ? uploadError.message
          : 'No se ha podido subir la imagen.'
      )

    } finally {
      setUploading(false)
    }
  }

  async function handleVideoUpload() {
    if (!file) {
      setError(
        'Selecciona un vídeo.'
      )

      return
    }

    setUploading(true)
    setError(null)
    setWarning(null)

    try {
      const duration =
        await readVideoDuration(
          file
        )

      const validation =
        validateVideoUpload(
          file.size,
          duration
        )

      if (
        validation?.code ===
        'VIDEO_TOO_LONG'
      ) {
        throw new Error(
          `El vídeo no puede superar los ${validation.maxSeconds} segundos.`
        )
      }

      if (
        validation?.code ===
        'VIDEO_TOO_LARGE'
      ) {
        throw new Error(
          `El vídeo supera los ${
            validation.maxBytes /
            1024 /
            1024
          } MB.`
        )
      }

      const replaced =
        await replaceExistingIfAny()

      if (!replaced) {
        return
      }

      const signed =
        await getSignedVideoUpload()

      const uploaded =
        await uploadVideoToCloudinary(
          file,
          signed
        )

      const result =
        await registerCoverVideoAction({
          contentId,

          cloudinaryPublicId:
            uploaded.public_id,

          format:
            uploaded.format,

          width:
            uploaded.width,

          height:
            uploaded.height,

          durationSeconds:
            uploaded.duration,

          bytes:
            uploaded.bytes,
        })

      if (!result.ok) {
        throw new Error(
          result.error
        )
      }

      setFile(null)

      window
        .location
        .reload()

    } catch (
      uploadError
    ) {
      setError(
        uploadError
          instanceof Error
          ? uploadError.message
          : 'No se ha podido subir el vídeo.'
      )

    } finally {
      setUploading(false)
    }
  }

  return (
    <div>

      {coverMedia ? (
        <div>

          {coverMedia.kind ===
          'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                buildImageUrl(
                  coverMedia
                    .cloudinaryPublicId,
                  'feed',
                  300
                )
              }
              alt=""
              width={200}
              height={200}
            />
          ) : (
            <p>
              {
                coverMedia
                  .cloudinaryPublicId
              }
              {' '}
              (vídeo)
            </p>
          )}

        </div>
      ) : (
        <p>
          Todavía no hay
          portada.
        </p>
      )}

      {allowVideo && (
        <>
          <label
            htmlFor="cover-kind"
          >
            Tipo de archivo
          </label>

          <select
            id="cover-kind"
            value={kind}
            disabled={
              uploading
            }
            onChange={
              (event) => {
                setKind(
                  event
                    .target
                    .value as
                    'image' |
                    'video'
                )

                setFile(null)
                setError(null)
              }
            }
          >
            <option
              value="image"
            >
              Imagen
            </option>

            <option
              value="video"
            >
              Vídeo
            </option>
          </select>
        </>
      )}

      <input
        type="file"
        accept={
          kind ===
          'video'
            ? 'video/*'
            : IMAGE_FILE_ACCEPT
        }
        disabled={
          uploading
        }
        onChange={
          (event) => {
            setFile(
              event
                .target
                .files?.[0] ??
              null
            )

            setError(null)
          }
        }
      />

      <p>
        {kind ===
        'video'
          ? 'Vídeo, máximo 100 MB / 180 s.'
          : 'JPG, PNG, WebP o AVIF. Máximo 5 MB. Sin animaciones.'}
      </p>

      <button
        type="button"
        disabled={
          uploading ||
          !file
        }
        onClick={
          kind ===
          'video'
            ? handleVideoUpload
            : handleImageUpload
        }
      >
        {uploading
          ? 'Subiendo...'
          : coverMedia
            ? 'Sustituir portada'
            : 'Subir portada'}
      </button>

      {error && (
        <p>
          {error}
        </p>
      )}

      {warning && (
        <p>
          {warning}
        </p>
      )}

    </div>
  )
}