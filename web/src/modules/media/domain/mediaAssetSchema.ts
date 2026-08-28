import { z } from 'zod'

export const mediaKindSchema =
  z.enum([
    'image',
    'video',
  ])

export const mediaStatusSchema =
  z.enum([
    'processing',
    'ready',
    'error',
  ])

export const registerImageForBlockSchema =
  z.object({
    blockId: z
      .string()
      .uuid(
        'El identificador del bloque no es válido'
      ),

    contentId: z
      .string()
      .uuid(
        'El identificador del contenido no es válido'
      ),

    cloudinaryPublicId: z
      .string()
      .trim()
      .min(
        1,
        'Falta el public ID de Cloudinary'
      ),

    format: z
      .string()
      .trim()
      .min(
        1,
        'Falta el formato de imagen'
      ),

    width: z
      .number()
      .int()
      .positive(),

    height: z
      .number()
      .int()
      .positive(),

    bytes: z
      .number()
      .int()
      .positive(),
  })

export const registerVideoForBlockSchema =
  z.object({
    blockId: z
      .string()
      .uuid(
        'El identificador del bloque no es válido'
      ),

    contentId: z
      .string()
      .uuid(
        'El identificador del contenido no es válido'
      ),

    cloudinaryPublicId: z
      .string()
      .trim()
      .min(
        1,
        'Falta el public ID de Cloudinary'
      ),

    format: z
      .string()
      .trim()
      .min(
        1,
        'Falta el formato del vídeo'
      ),

    width: z
      .number()
      .int()
      .positive(),

    height: z
      .number()
      .int()
      .positive(),

    durationSeconds: z
      .number()
      .positive()
      .max(
        180,
        'El vídeo no puede superar 180 segundos'
      )
      .transform(
        (value) =>
          Math.ceil(value)
      ),

    bytes: z
      .number()
      .int()
      .positive()
      .max(
        100 * 1024 * 1024,
        'El vídeo no puede superar 100 MB'
      ),
  })

export type MediaKind =
  z.infer<
    typeof mediaKindSchema
  >

export type MediaStatus =
  z.infer<
    typeof mediaStatusSchema
  >

export type RegisterImageForBlockInput =
  z.infer<
    typeof registerImageForBlockSchema
  >

export type RegisterVideoForBlockInput =
  z.infer<
    typeof registerVideoForBlockSchema
  >

export type MediaAsset = {
  id: string

  kind:
    MediaKind

  cloudinaryPublicId:
    string

  format:
    string | null

  width:
    number | null

  height:
    number | null

  durationSeconds:
    number | null

  bytes:
    number | null

  status:
    MediaStatus

  createdAt:
    string
}