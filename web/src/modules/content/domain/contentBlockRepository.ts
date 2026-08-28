import type {
  MediaAsset,
} from '@/modules/media/domain/mediaAssetSchema'

import type {
  ContentBlockConfig,
  ContentBlockTranslation,
  ContentBlockType,
  CreateContentBlockInput,
  DeleteContentBlockInput,
  UpdateContentBlockInput,
  UpsertContentBlockTranslationInput,
} from './contentBlockSchema'

export type ContentBlock = {
  id: string
  contentId: string
  type: ContentBlockType
  sortOrder: number
  config: ContentBlockConfig

  mediaId:
    string | null

  media:
    MediaAsset | null

  createdAt: string

  translations:
    ContentBlockTranslation[]
}

export interface ContentBlockRepository {
  listByContentId(
    contentId: string
  ): Promise<ContentBlock[]>

  create(
    input:
      CreateContentBlockInput
  ): Promise<string>

  update(
    input:
      UpdateContentBlockInput
  ): Promise<string>

  delete(
    input:
      DeleteContentBlockInput
  ): Promise<string>

  upsertTranslation(
    input:
      UpsertContentBlockTranslationInput
  ): Promise<string>
}