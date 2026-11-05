import { z } from 'zod'

const signedMediaUploadSchema = z.object({
  timestamp: z.number(),

  signature: z.string().min(1),

  folder: z.string().min(1),

  apiKey: z.string().min(1),

  cloudName: z.string().min(1),
})

const cloudinaryImageResultSchema = z.object({
  public_id: z.string().min(1),

  format: z.string().min(1),

  width: z.number().int().positive(),

  height: z.number().int().positive(),

  bytes: z.number().int().positive(),
})

const cloudinaryVideoResultSchema = z.object({
  public_id: z.string().min(1),

  format: z.string().min(1),

  width: z.number().int().positive(),

  height: z.number().int().positive(),

  duration: z.number().positive(),

  bytes: z.number().int().positive(),
})

export type SignedMediaUpload = z.infer<typeof signedMediaUploadSchema>

export type CloudinaryImageResult = z.infer<typeof cloudinaryImageResultSchema>

export type CloudinaryVideoResult = z.infer<typeof cloudinaryVideoResultSchema>

async function getSignedUpload(endpoint: string): Promise<SignedMediaUpload> {
  const response = await fetch(endpoint, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('No se ha podido autorizar la subida.')
  }

  const json: unknown = await response.json()

  return signedMediaUploadSchema.parse(json)
}

export async function getSignedImageUpload(): Promise<SignedMediaUpload> {
  return getSignedUpload('/api/admin/media/sign')
}

export async function getSignedVideoUpload(): Promise<SignedMediaUpload> {
  return getSignedUpload('/api/admin/media/sign-video')
}

function createUploadFormData(file: File, signed: SignedMediaUpload) {
  const formData = new FormData()

  formData.append('file', file)

  formData.append('api_key', signed.apiKey)

  formData.append('timestamp', String(signed.timestamp))

  formData.append('signature', signed.signature)

  formData.append('folder', signed.folder)

  return formData
}

export async function uploadImageToCloudinary(
  file: File,
  signed: SignedMediaUpload,
): Promise<CloudinaryImageResult> {
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
    {
      method: 'POST',
      body: createUploadFormData(file, signed),
    },
  )

  const json: unknown = await response.json()

  if (!response.ok) {
    throw new Error('Cloudinary ha rechazado la imagen.')
  }

  return cloudinaryImageResultSchema.parse(json)
}

export async function uploadVideoToCloudinary(
  file: File,
  signed: SignedMediaUpload,
): Promise<CloudinaryVideoResult> {
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/video/upload`,
    {
      method: 'POST',
      body: createUploadFormData(file, signed),
    },
  )

  const json: unknown = await response.json()

  if (!response.ok) {
    throw new Error('Cloudinary ha rechazado el vídeo.')
  }

  return cloudinaryVideoResultSchema.parse(json)
}
