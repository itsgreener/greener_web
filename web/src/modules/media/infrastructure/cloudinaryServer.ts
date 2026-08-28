import {
  v2 as cloudinary,
} from 'cloudinary'

import {
  env,
} from '@/lib/env'

const IMAGE_FOLDER =
  'greener/content'

const VIDEO_FOLDER =
  'greener/content/videos'

export type SignedMediaUpload = {
  timestamp: number
  signature: string
  folder: string
  apiKey: string
  cloudName: string
}

function createSignedUpload(
  folder: string
): SignedMediaUpload {
  const timestamp =
    Math.floor(
      Date.now() / 1000
    )

  const signature =
    cloudinary.utils
      .api_sign_request(
        {
          timestamp,
          folder,
        },
        env.CLOUDINARY_API_SECRET
      )

  return {
    timestamp,
    signature,
    folder,

    apiKey:
      env.CLOUDINARY_API_KEY,

    cloudName:
      env
        .NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  }
}

export function createSignedImageUpload():
  SignedMediaUpload {
  return createSignedUpload(
    IMAGE_FOLDER
  )
}

export function createSignedVideoUpload():
  SignedMediaUpload {
  return createSignedUpload(
    VIDEO_FOLDER
  )
}