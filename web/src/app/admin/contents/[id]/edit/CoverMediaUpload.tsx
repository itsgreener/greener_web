'use client'

import { useRef, useState } from 'react'

import { buildImageUrl } from '@/modules/media/infrastructure/cloudinaryUrl'
import { ADMIN_THUMBNAIL_WIDTH } from '@/modules/media/domain/mediaDelivery'

import {
  VIDEO_LIMITS,
  validateVideoUpload,
} from '@/modules/media/domain/mediaLimits'

import { closestClosedRatio } from '@/modules/media/domain/closestRatio'

import {
  ratioFromFilename,
  ratioMismatchMessage,
} from '@/modules/media/domain/ratioFromFilename'

import { pinRatioSchema } from '@/modules/pin/domain/pinSchema'

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

import { readLocalVideoDuration } from '@/modules/media/infrastructure/readLocalVideoDuration'

import {
  registerCoverImageAction,
  registerCoverVideoAction,
  deleteCoverMediaAction,
} from './mediaActions'

import { discardUploadQuietly, type UploadedAssetRef } from './discardUpload'

type CoverMedia = {
  id: string
  kind: 'image' | 'video'
  cloudinaryPublicId: string
}

type Props = {
  contentId: string
  allowVideo: boolean

  coverMedia: CoverMedia | null
}

type Dimensions = {
  width: number
  height: number
}

// Sugerencia automática del ratio (especificacion-final-formato-detalle.md
// §2, §4): lee las dimensiones reales del archivo elegido, en el propio
// navegador, antes de subir nada — el admin ve el <select> ya precargado
// con la opción más parecida y puede cambiarla a mano sin problema, esto
// nunca decide ni se guarda por su cuenta.
function readImageDimensions(file: File): Promise<Dimensions> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(image.src)

      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
    }

    image.onerror = () => {
      URL.revokeObjectURL(image.src)

      reject(new Error('No se ha podido leer las dimensiones de la imagen.'))
    }

    image.src = URL.createObjectURL(file)
  })
}

function readVideoDimensions(file: File): Promise<Dimensions> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')

    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)

      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
      })
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)

      reject(new Error('No se ha podido leer las dimensiones del vídeo.'))
    }

    video.src = URL.createObjectURL(file)
  })
}

export default function CoverMediaUpload({
  contentId,
  allowVideo,
  coverMedia,
}: Props) {
  const [uploading, setUploading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [warning, setWarning] = useState<string | null>(null)

  const [file, setFile] = useState<File | null>(null)

  const [kind, setKind] = useState<'image' | 'video'>('image')

  const [ratio, setRatio] = useState<
    (typeof pinRatioSchema.options)[number] | ''
  >('')

  // De dónde sale el ratio del <select>: el nombre del archivo
  // (`[nombre]-[proporción]-[tipo].ext`), sus dimensiones o el admin.
  const [ratioSource, setRatioSource] = useState<
    'filename' | 'dimensions' | 'manual' | null
  >(null)

  const [dimensions, setDimensions] = useState<Dimensions | null>(null)

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
      setError(result.error)

      return false
    }

    if (result.warning) {
      setWarning(result.warning)
    }

    return true
  }

  async function handleImageUpload() {
    if (!file) {
      setError('Selecciona una imagen.')

      return
    }

    const validationError = await validateImageSelection(file)

    if (validationError) {
      setError(validationError)

      return
    }

    if (!ratio) {
      setError('Selecciona un ratio antes de subir la portada.')

      return
    }

    setUploading(true)
    setError(null)
    setWarning(null)

    let uploadedAsset: UploadedAssetRef | null = null

    try {
      const replaced = await replaceExistingIfAny()

      if (!replaced) {
        return
      }

      const signed = await getSignedImageUpload()

      const uploaded = await uploadImageToCloudinary(file, signed)

      uploadedAsset = { publicId: uploaded.public_id, kind: 'image' }

      const result = await registerCoverImageAction({
        contentId,

        cloudinaryPublicId: uploaded.public_id,

        format: uploaded.format,

        width: uploaded.width,

        height: uploaded.height,

        bytes: uploaded.bytes,

        ratio,
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      setFile(null)
      setRatio('')
      setRatioSource(null)
      setDimensions(null)

      window.location.reload()
    } catch (uploadError) {
      await discardUploadQuietly(uploadedAsset)

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'No se ha podido subir la imagen.',
      )
    } finally {
      setUploading(false)
    }
  }

  async function handleVideoUpload() {
    if (!file) {
      setError('Selecciona un vídeo.')

      return
    }

    if (!ratio) {
      setError('Selecciona un ratio antes de subir la portada.')

      return
    }

    setUploading(true)
    setError(null)
    setWarning(null)

    let uploadedAsset: UploadedAssetRef | null = null

    try {
      // Mismo parche urgente que CaseCarouselManager.tsx (30 sep): si el
      // navegador no puede leer la duración localmente (típico con
      // .mov/HEVC), no se bloquea aquí — se valida solo el tamaño y se
      // sube. La duración real se valida después con el dato de
      // Cloudinary, la fuente de verdad.
      //
      // OJO con el orden en ESTE fichero en concreto: replaceExistingIfAny()
      // BORRA la portada anterior de forma permanente. Por eso aquí —a
      // diferencia de CaseCarouselManager/PinMediaManager, que solo
      // añaden un elemento nuevo— el borrado se ha movido a DESPUÉS de
      // confirmar con el dato real de Cloudinary que el vídeo es válido,
      // no antes de subirlo. Si se borrara antes y el vídeo real
      // resultara demasiado largo, el caso se quedaría sin portada.
      // `null` = el navegador no ha podido dar una duración fiable (vídeo
      // no decodificable, duración `Infinity`/`NaN` de un WebM sin cabecera,
      // o sin respuesta a tiempo): no se bloquea aquí, se valida después con
      // la duración real de Cloudinary. Ver readLocalVideoDuration.
      const localDuration = await readLocalVideoDuration(file)

      if (localDuration !== null) {
        const validation = validateVideoUpload(file.size, localDuration)

        if (validation?.code === 'VIDEO_TOO_LONG') {
          throw new Error(
            `El vídeo no puede superar los ${validation.maxSeconds} segundos.`,
          )
        }

        if (validation?.code === 'VIDEO_TOO_LARGE') {
          throw new Error(
            `El vídeo supera los ${validation.maxBytes / 1024 / 1024} MB.`,
          )
        }
      } else if (file.size > VIDEO_LIMITS.maxSizeBytes) {
        throw new Error(
          `El vídeo supera los ${VIDEO_LIMITS.maxSizeBytes / 1024 / 1024} MB.`,
        )
      }

      const signed = await getSignedVideoUpload()

      const uploaded = await uploadVideoToCloudinary(file, signed)

      uploadedAsset = { publicId: uploaded.public_id, kind: 'video' }

      // Validación real con la duración de Cloudinary, ANTES de tocar la
      // portada existente.
      const finalValidation = validateVideoUpload(
        uploaded.bytes,
        uploaded.duration,
      )

      if (finalValidation?.code === 'VIDEO_TOO_LONG') {
        throw new Error(
          `El vídeo dura más de los ${finalValidation.maxSeconds} segundos permitidos (el archivo subido se ha descartado y la portada anterior no se ha tocado).`,
        )
      }

      if (finalValidation?.code === 'VIDEO_TOO_LARGE') {
        throw new Error(
          `El vídeo supera los ${finalValidation.maxBytes / 1024 / 1024} MB (el archivo subido se ha descartado y la portada anterior no se ha tocado).`,
        )
      }

      const replaced = await replaceExistingIfAny()

      if (!replaced) {
        // El vídeo nuevo ya está en Cloudinary pero no se va a usar (el
        // admin canceló o falló la sustitución): se descarta.
        await discardUploadQuietly(uploadedAsset)

        return
      }

      const result = await registerCoverVideoAction({
        contentId,

        cloudinaryPublicId: uploaded.public_id,

        format: uploaded.format,

        width: uploaded.width,

        height: uploaded.height,

        durationSeconds: uploaded.duration,

        bytes: uploaded.bytes,

        ratio,
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      setFile(null)
      setRatio('')
      setRatioSource(null)
      setDimensions(null)

      window.location.reload()
    } catch (uploadError) {
      await discardUploadQuietly(uploadedAsset)

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'No se ha podido subir el vídeo.',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {coverMedia ? (
        <div>
          {coverMedia.kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={buildImageUrl(
                coverMedia.cloudinaryPublicId,
                'feed',
                ADMIN_THUMBNAIL_WIDTH,
              )}
              alt=""
              width={200}
              height={200}
            />
          ) : (
            <p>{coverMedia.cloudinaryPublicId} (vídeo)</p>
          )}
        </div>
      ) : (
        <p>Todavía no hay portada.</p>
      )}

      {allowVideo && (
        <>
          <label htmlFor="cover-kind">Tipo de archivo</label>

          <select
            id="cover-kind"
            value={kind}
            disabled={uploading}
            onChange={(event) => {
              setKind(event.target.value as 'image' | 'video')

              setFile(null)
              setError(null)
              setRatio('')
              setRatioSource(null)
              setDimensions(null)
            }}
          >
            <option value="image">Imagen</option>

            <option value="video">Vídeo</option>
          </select>
        </>
      )}

      <input
        type="file"
        accept={kind === 'video' ? 'video/*' : IMAGE_FILE_ACCEPT}
        disabled={uploading}
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null

          setFile(selected)

          setError(null)
          setRatio('')
          setRatioSource(null)
          setDimensions(null)

          const current = ++selectionId.current

          if (!selected) {
            return
          }

          // El nombre manda si trae una proporción legible; si no, se
          // sugiere la más parecida a las dimensiones reales.
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
              // Sin sugerencia disponible: el admin sigue pudiendo
              // elegir el ratio a mano en el <select> de abajo, no
              // bloquea la subida.
            })
        }}
      />

      <label htmlFor="cover-ratio">
        Ratio (sugerido a partir del archivo — puedes cambiarlo)
      </label>

      <select
        id="cover-ratio"
        value={ratio}
        disabled={uploading}
        onChange={(event) => {
          setRatio(
            event.target.value as (typeof pinRatioSchema.options)[number],
          )
          setRatioSource('manual')
        }}
      >
        <option value="">— Selecciona un ratio —</option>

        {pinRatioSchema.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {ratioSource === 'filename' && <small>detectado del nombre</small>}

      {filenameMismatch && <p>{filenameMismatch}</p>}

      <p>
        {kind === 'video'
          ? 'Vídeo, máximo 100 MB / 180 s.'
          : 'JPG, PNG, WebP o AVIF. Máximo 5 MB. Sin animaciones.'}
      </p>

      <button
        type="button"
        disabled={uploading || !file || !ratio}
        onClick={kind === 'video' ? handleVideoUpload : handleImageUpload}
      >
        {uploading
          ? 'Subiendo...'
          : coverMedia
            ? 'Sustituir portada'
            : 'Subir portada'}
      </button>

      {error && <p>{error}</p>}

      {warning && <p>{warning}</p>}
    </div>
  )
}
