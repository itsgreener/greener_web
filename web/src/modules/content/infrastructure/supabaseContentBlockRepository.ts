import {
  createClient,
} from '@/lib/supabase/server'

import type {
  MediaAsset,
  MediaKind,
  MediaStatus,
} from '@/modules/media/domain/mediaAssetSchema'

import type {
  ContentBlock,
  ContentBlockRepository,
} from '../domain/contentBlockRepository'

import type {
  ContentBlockConfig,
  ContentBlockTranslation,
  ContentBlockType,
  CreateContentBlockInput,
  DeleteContentBlockInput,
  UpdateContentBlockInput,
  UpsertContentBlockTranslationInput,
} from '../domain/contentBlockSchema'

import type {
  Locale,
} from '../domain/contentSchema'

type SupabaseBlockTranslationRow = {
  locale: Locale
  body_rich_text: string | null
  caption: string | null
  quote_text: string | null
}

type SupabaseMediaAssetRow = {
  id: string
  kind: MediaKind
  cloudinary_public_id: string
  format: string | null
  width: number | null
  height: number | null
  duration_seconds: number | null
  bytes: number | null
  status: MediaStatus
  created_at: string
}

type SupabaseContentBlockRow = {
  id: string
  content_id: string
  type: ContentBlockType
  sort_order: number
  config: unknown
  media_id: string | null
  created_at: string

  media:
    | SupabaseMediaAssetRow
    | SupabaseMediaAssetRow[]
    | null

  translations:
    SupabaseBlockTranslationRow[]
}

function createRepositoryError(
  message: string,
  code?: string
) {
  const error =
    new Error(
      message
    ) as Error & {
      code?: string
    }

  error.code = code

  return error
}

function normalizeConfig(
  value: unknown
): ContentBlockConfig {
  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as
      ContentBlockConfig
  }

  return {}
}

function normalizeMediaRow(
  value:
    | SupabaseMediaAssetRow
    | SupabaseMediaAssetRow[]
    | null
): SupabaseMediaAssetRow | null {
  if (!value) {
    return null
  }

  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value
}

function mapMediaAsset(
  value:
    | SupabaseMediaAssetRow
    | SupabaseMediaAssetRow[]
    | null
): MediaAsset | null {
  const row =
    normalizeMediaRow(
      value
    )

  if (!row) {
    return null
  }

  return {
    id:
      row.id,

    kind:
      row.kind,

    cloudinaryPublicId:
      row.cloudinary_public_id,

    format:
      row.format,

    width:
      row.width,

    height:
      row.height,

    durationSeconds:
      row.duration_seconds,

    bytes:
      row.bytes,

    status:
      row.status,

    createdAt:
      row.created_at,
  }
}

function mapTranslation(
  blockId: string,
  row: SupabaseBlockTranslationRow
): ContentBlockTranslation {
  return {
    blockId,

    locale:
      row.locale,

    bodyRichText:
      row.body_rich_text,

    caption:
      row.caption,

    quoteText:
      row.quote_text,
  }
}

function mapBlock(
  row: SupabaseContentBlockRow
): ContentBlock {
  return {
    id:
      row.id,

    contentId:
      row.content_id,

    type:
      row.type,

    sortOrder:
      row.sort_order,

    config:
      normalizeConfig(
        row.config
      ),

    mediaId:
      row.media_id,

    media:
      mapMediaAsset(
        row.media
      ),

    createdAt:
      row.created_at,

    translations:
      row.translations.map(
        (translation) =>
          mapTranslation(
            row.id,
            translation
          )
      ),
  }
}

export const supabaseContentBlockRepository:
  ContentBlockRepository = {

  async listByContentId(
    contentId: string
  ) {
    const supabase =
      await createClient()

    const {
      data,
      error,
    } = await supabase
      .from(
        'content_block'
      )
      .select(`
        id,
        content_id,
        type,
        sort_order,
        config,
        media_id,
        created_at,

        media:media_asset (
          id,
          kind,
          cloudinary_public_id,
          format,
          width,
          height,
          duration_seconds,
          bytes,
          status,
          created_at
        ),

        translations:content_block_translation (
          locale,
          body_rich_text,
          caption,
          quote_text
        )
      `)
      .eq(
        'content_id',
        contentId
      )
      .order(
        'sort_order',
        {
          ascending: true,
        }
      )
      .order(
        'created_at',
        {
          ascending: true,
        }
      )

    if (error) {
      throw createRepositoryError(
        error.message,
        error.code
      )
    }

    const rows =
      (data ?? []) as unknown as
        SupabaseContentBlockRow[]

    return rows.map(
      mapBlock
    )
  },

  async create(
    input:
      CreateContentBlockInput
  ) {
    const supabase =
      await createClient()

    const {
      data,
      error,
    } = await supabase.rpc(
      'create_content_block',
      {
        p_content_id:
          input.contentId,

        p_type:
          input.type,

        p_sort_order:
          input.sortOrder,

        p_config:
          input.config,
      }
    )

    if (error) {
      throw createRepositoryError(
        error.message,
        error.code
      )
    }

    return data as string
  },

  async update(
    input:
      UpdateContentBlockInput
  ) {
    const supabase =
      await createClient()

    const {
      data,
      error,
    } = await supabase.rpc(
      'update_content_block',
      {
        p_block_id:
          input.id,

        p_sort_order:
          input.sortOrder,

        p_config:
          input.config,
      }
    )

    if (error) {
      throw createRepositoryError(
        error.message,
        error.code
      )
    }

    return data as string
  },

  async delete(
    input:
      DeleteContentBlockInput
  ) {
    const supabase =
      await createClient()

    const {
      data,
      error,
    } = await supabase.rpc(
      'delete_content_block',
      {
        p_block_id:
          input.id,
      }
    )

    if (error) {
      throw createRepositoryError(
        error.message,
        error.code
      )
    }

    return data as string
  },

  async upsertTranslation(
    input:
      UpsertContentBlockTranslationInput
  ) {
    const supabase =
      await createClient()

    const {
      data,
      error,
    } = await supabase.rpc(
      'upsert_content_block_translation',
      {
        p_block_id:
          input.blockId,

        p_locale:
          input.locale,

        p_body_rich_text:
          input.bodyRichText,

        p_caption:
          input.caption,

        p_quote_text:
          input.quoteText,
      }
    )

    if (error) {
      throw createRepositoryError(
        error.message,
        error.code
      )
    }

    return data as string
  },
}