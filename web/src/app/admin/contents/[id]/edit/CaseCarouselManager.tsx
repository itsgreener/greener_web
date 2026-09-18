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
  addCaseCarouselImageAction,
  addCaseCarouselVideoAction,
  removeCaseCarouselMediaAction,
} from './caseCarouselActions'

type CarouselItem = {
  mediaId: string
  kind: 'image' | 'video'
  cloudinaryPublicId: string
  sortOrder: number
  alt: string
}

type Props = {
  contentId: string
  items: CarouselItem[]
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

export default function CaseCarouselManager({
  contentId,
  items,
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

  const [
    alt,
    setAlt,
  ] =
    useState('')

  const sorted =
    [...items]
      .sort(
        (a, b) =>
          a.sortOrder -
          b.sortOrder
      )

  const nextSortOrder =
    sorted.length

  async function handleRemove(
    item:
      CarouselItem
  ) {
    setError(null)
    setWarning(null)

    const result =
      await removeCaseCarouselMediaAction({
        contentId,

        mediaId:
          item.mediaId,

        cloudinaryPublicId:
          item
            .cloudinaryPublicId,

        kind:
          item.kind,
      })

    if (!result.ok) {
      setError(
        result.error
      )

      return
    }

    if (
      result.warning
    ) {
      setWarning(
        result.warning
      )
    }

    window
      .location
      .reload()
  }

  async function handleImageUpload() {
    if (!file) {
      setError(
        'Selecciona una imagen.'
      )

      return
    }

    if (!alt.trim()) {
      setError(
        'El alt es obligatorio antes de subir la imagen.'
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
      const signed =
        await getSignedImageUpload()

      const uploaded =
        await uploadImageToCloudinary(
          file,
          signed
        )

      const result =
        await addCaseCarouselImageAction({
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

          sortOrder:
            nextSortOrder,

          alt:
            alt.trim(),
        })

      if (!result.ok) {
        throw new Error(
          result.error
        )
      }

      setFile(null)
      setAlt('')

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

    if (!alt.trim()) {
      setError(
        'El alt es obligatorio antes de subir el vídeo.'
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

      const signed =
        await getSignedVideoUpload()

      const uploaded =
        await uploadVideoToCloudinary(
          file,
          signed
        )

      const result =
        await addCaseCarouselVideoAction({
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

          sortOrder:
            nextSortOrder,

          alt:
            alt.trim(),
        })

      if (!result.ok) {
        throw new Error(
          result.error
        )
      }

      setFile(null)
      setAlt('')

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

      <h4>
        Carrusel de detalle
        {' '}
        ({sorted.length})
      </h4>

      <div>
        {sorted.map(
          (item) => (
            <div
              key={
                item.mediaId
              }
            >

              {item.kind ===
              'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    buildImageUrl(
                      item
                        .cloudinaryPublicId,
                      'feed',
                      200
                    )
                  }
                  alt={
                    item.alt
                  }
                  width={100}
                  height={100}
                />
              ) : (
                <p>
                  {
                    item
                      .cloudinaryPublicId
                  }
                  {' '}
                  (vídeo)
                </p>
              )}

              <p>
                {item.alt}
              </p>

              <button
                type="button"
                onClick={
                  () =>
                    handleRemove(
                      item
                    )
                }
              >
                Quitar
              </button>

            </div>
          )
        )}

        {sorted.length ===
          0 && (
          <p>
            Todavía no hay
            carrusel para
            este caso.
          </p>
        )}
      </div>

      <label
        htmlFor="carousel-alt"
      >
        Alt (obligatorio)
      </label>

      <input
        id="carousel-alt"
        type="text"
        value={alt}
        disabled={
          uploading
        }
        onChange={
          (event) =>
            setAlt(
              event
                .target
                .value
            )
        }
      />

      <label
        htmlFor="carousel-kind"
      >
        Tipo de archivo
      </label>

      <select
        id="carousel-kind"
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
          : 'Añadir al carrusel'}
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