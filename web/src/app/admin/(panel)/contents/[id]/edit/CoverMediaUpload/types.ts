import type { pinRatioSchema } from '@/modules/shared/domain/ratio'

export type CoverMedia = {
  id: string
  kind: 'image' | 'video'
  cloudinaryPublicId: string
}

export type CoverMediaUploadProps = {
  contentId: string
  allowVideo: boolean

  coverMedia: CoverMedia | null
}

export type Dimensions = {
  width: number
  height: number
}

export type RatioValue = (typeof pinRatioSchema.options)[number]

// De dónde sale el ratio del <select>: el nombre del archivo
// (`[nombre]-[proporción]-[tipo].ext`), sus dimensiones o el admin.
export type RatioSource = 'filename' | 'dimensions' | 'manual'
