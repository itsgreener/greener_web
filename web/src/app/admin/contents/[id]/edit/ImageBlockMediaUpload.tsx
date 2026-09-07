'use client'

import Image from 'next/image'

import { useRouter } from 'next/navigation'

import { useState, type FormEvent } from 'react'

import type { MediaAsset } from '@/modules/media/domain/mediaAssetSchema'

import { validateImageUpload } from '@/modules/media/domain/mediaLimits'

import { buildImageUrl } from '@/modules/media/infrastructure/cloudinaryUrl'

import {
  getSignedImageUpload,
  uploadImageToCloudinary,
} from '@/modules/media/infrastructure/cloudinaryUpload'

import {
  deleteBlockMediaAction,
  registerImageForBlockAction,
} from './mediaActions'

type Props = {
  blockId: string
  contentId: string

  media: MediaAsset | null
}

export default function ImageBlockMediaUpload({
  blockId,
  contentId,
  media,
}: Props) {
  const router = useRouter()

  const [file, setFile] = useState<File | null>(null)

  const [uploading, setUploading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [success, setSuccess] = useState<string | null>(null)

  const [warning, setWarning] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget

    setError(null)
    setSuccess(null)
    setWarning(null)

    if (!file) {
      setError('Selecciona una imagen.')

      return
    }

    if (!file.type.startsWith('image/')) {
      setError('El archivo seleccionado no es una imagen.')

      return
    }

    const validation = validateImageUpload(file.size)

    if (validation && validation.code === 'IMAGE_TOO_LARGE') {
      const maxMb = Math.round(validation.maxBytes / 1024 / 1024)

      setError(`La imagen supera el límite de ${maxMb} MB.`)

      return
    }

    setUploading(true)

    try {
      // Al sustituir una imagen, primero se borra la anterior (Postgres y
      // Cloudinary) para no dejar medios huérfanos consumiendo el plan
      // Free. Si el borrado falla porque el medio sigue en uso en otro
      // sitio (o ha cambiado desde otra pestaña), se detiene aquí sin
      // llegar a subir nada nuevo.
      if (media && media.kind === 'image') {
        const deleteResult = await deleteBlockMediaAction({
          blockId,
          mediaId: media.id,
          cloudinaryPublicId: media.cloudinaryPublicId,
          kind: 'image',
        })

        if (!deleteResult.ok) {
          throw new Error(deleteResult.error)
        }

        if (deleteResult.warning) {
          setWarning(deleteResult.warning)
        }
      }

      const signed = await getSignedImageUpload()

      const uploaded = await uploadImageToCloudinary(file, signed)

      const result = await registerImageForBlockAction({
        blockId,
        contentId,

        cloudinaryPublicId: uploaded.public_id,

        format: uploaded.format,

        width: uploaded.width,

        height: uploaded.height,

        bytes: uploaded.bytes,
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      setSuccess('Imagen subida y vinculada correctamente.')

      setFile(null)

      const input = form.elements.namedItem('imageFile')

      if (input instanceof HTMLInputElement) {
        input.value = ''
      }

      router.refresh()
    } catch (uploadError) {
      console.error(uploadError)

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'No se ha podido subir la imagen.',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <h4>Imagen del bloque</h4>

      {media && media.kind === 'image' && (
        <div>
          <Image
            src={buildImageUrl(media.cloudinaryPublicId, 'detail', 960)}
            alt="Vista previa de la imagen del bloque"
            width={media.width ?? 960}
            height={media.height ?? 640}
            sizes="(max-width: 1000px) 100vw, 960px"
            style={{
              maxWidth: '100%',
              height: 'auto',
            }}
          />

          <p>{media.cloudinaryPublicId}</p>

          {media.width && media.height && (
            <p>
              {media.width}
              {' × '}
              {media.height}
              {' px'}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="file"
          name="imageFile"
          accept="image/*"
          disabled={uploading}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null)

            setError(null)
            setSuccess(null)
            setWarning(null)
          }}
        />

        <p>Tamaño máximo: 5 MB.</p>

        {error && <p>{error}</p>}

        {warning && <p>{warning}</p>}

        {success && <p>{success}</p>}

        <button type="submit" disabled={uploading}>
          {uploading
            ? 'Subiendo...'
            : media
              ? 'Sustituir imagen'
              : 'Subir imagen'}
        </button>
      </form>
    </div>
  )
}
