'use client'

import {
  useRouter,
} from 'next/navigation'

import {
  useState,
  type FormEvent,
} from 'react'

import type {
  MediaAsset,
} from '@/modules/media/domain/mediaAssetSchema'

import {
  validateVideoUpload,
} from '@/modules/media/domain/mediaLimits'

import {
  buildVideoFullUrl,
  buildVideoPosterUrl,
} from '@/modules/media/infrastructure/cloudinaryUrl'

import {
  getSignedVideoUpload,
  uploadVideoToCloudinary,
} from '@/modules/media/infrastructure/cloudinaryUpload'

import {
  registerVideoForBlockAction,
} from './mediaActions'

type Props = {
  blockId: string
  contentId: string

  media:
    MediaAsset | null
}

function getVideoDuration(
  file: File
): Promise<number> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const video =
        document.createElement(
          'video'
        )

      const objectUrl =
        URL.createObjectURL(
          file
        )

      video.preload =
        'metadata'

      video.onloadedmetadata =
        () => {
          const duration =
            video.duration

          URL.revokeObjectURL(
            objectUrl
          )

          if (
            !Number.isFinite(
              duration
            ) ||
            duration <= 0
          ) {
            reject(
              new Error(
                'No se ha podido leer la duración del vídeo.'
              )
            )

            return
          }

          resolve(
            duration
          )
        }

      video.onerror =
        () => {
          URL.revokeObjectURL(
            objectUrl
          )

          reject(
            new Error(
              'No se ha podido leer el archivo de vídeo.'
            )
          )
        }

      video.src =
        objectUrl
    }
  )
}

export default function VideoBlockMediaUpload({
  blockId,
  contentId,
  media,
}: Props) {
  const router =
    useRouter()

  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null
    )

  const [
    uploading,
    setUploading,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    )

  const [
    success,
    setSuccess,
  ] =
    useState<string | null>(
      null
    )

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const form =
      event.currentTarget

    setError(null)
    setSuccess(null)

    if (!file) {
      setError(
        'Selecciona un vídeo.'
      )

      return
    }

    const allowedTypes = [
      'video/mp4',
      'video/webm',
    ]

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setError(
        'Utiliza un vídeo MP4 o WebM.'
      )

      return
    }

    setUploading(true)

    try {
      const duration =
        await getVideoDuration(
          file
        )

      const validation =
        validateVideoUpload(
          file.size,
          duration
        )

      if (validation) {
        if (
          validation.code ===
          'VIDEO_TOO_LARGE'
        ) {
          const maxMb =
            Math.round(
              validation.maxBytes /
              1024 /
              1024
            )

          throw new Error(
            `El vídeo supera el límite de ${maxMb} MB.`
          )
        }

        if (
          validation.code ===
          'VIDEO_TOO_LONG'
        ) {
          throw new Error(
            `El vídeo supera el límite de ${validation.maxSeconds} segundos.`
          )
        }

        throw new Error(
          'El vídeo no cumple los límites permitidos.'
        )
      }

      const signed =
        await getSignedVideoUpload()

      const uploaded =
        await uploadVideoToCloudinary(
          file,
          signed
        )

      const result =
        await registerVideoForBlockAction({
          blockId,
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

      setSuccess(
        'Vídeo subido y vinculado correctamente.'
      )

      setFile(null)

      const input =
        form.elements
          .namedItem(
            'videoFile'
          )

      if (
        input instanceof
        HTMLInputElement
      ) {
        input.value = ''
      }

      router.refresh()

    } catch (uploadError) {
      console.error(
        uploadError
      )

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'No se ha podido subir el vídeo.'
      )

    } finally {
      setUploading(false)
    }
  }

  return (
    <div>

      <h4>
        Vídeo del bloque
      </h4>

      {media &&
        media.kind ===
          'video' && (
        <div>

          <video
            controls
            preload="metadata"
            poster={
              buildVideoPosterUrl(
                media
                  .cloudinaryPublicId
              )
            }
            style={{
              display:
                'block',
              width:
                '100%',
              maxWidth:
                '960px',
              height:
                'auto',
            }}
          >
            <source
              src={
                buildVideoFullUrl(
                  media
                    .cloudinaryPublicId
                )
              }
            />

            Tu navegador no puede
            reproducir este vídeo.
          </video>

          <p>
            {
              media
                .cloudinaryPublicId
            }
          </p>

          {media
            .durationSeconds && (
            <p>
              Duración:
              {' '}
              {
                media
                  .durationSeconds
              }
              {' s'}
            </p>
          )}

          {media.width &&
            media.height && (
            <p>
              {media.width}
              {' × '}
              {media.height}
              {' px'}
            </p>
          )}

        </div>
      )}

      <form
        onSubmit={
          handleSubmit
        }
      >

        <input
          type="file"
          name="videoFile"
          accept="video/mp4,video/webm"
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
              setSuccess(null)
            }
          }
        />

        <p>
          Formatos:
          {' '}
          MP4 o WebM.
        </p>

        <p>
          Tamaño máximo:
          {' '}
          100 MB.
        </p>

        <p>
          Duración máxima:
          {' '}
          180 segundos.
        </p>

        {error && (
          <p>
            {error}
          </p>
        )}

        {success && (
          <p>
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={
            uploading
          }
        >
          {uploading
            ? 'Subiendo...'
            : media
              ? 'Sustituir vídeo'
              : 'Subir vídeo'}
        </button>

      </form>

    </div>
  )
}