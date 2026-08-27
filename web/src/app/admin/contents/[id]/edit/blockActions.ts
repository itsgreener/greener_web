'use server'

import {
  revalidatePath,
} from 'next/cache'

import {
  contentBlockTranslationSchema,
  createContentBlockSchema,
  deleteContentBlockSchema,
  updateContentBlockSchema,
} from '@/modules/content/domain/contentBlockSchema'

import {
  createContentBlock,
} from '@/modules/content/application/createContentBlock'

import {
  updateContentBlock,
} from '@/modules/content/application/updateContentBlock'

import {
  deleteContentBlock,
} from '@/modules/content/application/deleteContentBlock'

import {
  upsertContentBlockTranslation,
} from '@/modules/content/application/upsertContentBlockTranslation'

export type CreateBlockActionState = {
  fieldErrors?: {
    contentId?: string[]
    type?: string[]
    sortOrder?: string[]
    config?: string[]
  }

  formError?: string
  success?: boolean
}

export type UpdateBlockActionState = {
  fieldErrors?: {
    id?: string[]
    sortOrder?: string[]
    config?: string[]
  }

  formError?: string
  success?: boolean
}

export type DeleteBlockActionState = {
  error?: string
}

export type BlockTranslationActionState = {
  fieldErrors?: {
    blockId?: string[]
    locale?: string[]
    bodyRichText?: string[]
    caption?: string[]
    quoteText?: string[]
  }

  formError?: string
  success?: boolean
}

type JsonObjectResult =
  | {
      value:
        Record<
          string,
          unknown
        >
      error?: undefined
    }
  | {
      value?: undefined
      error: string
    }

function parseJsonObject(
  value:
    FormDataEntryValue | null
): JsonObjectResult {

  if (
    typeof value !== 'string' ||
    value.trim() === ''
  ) {
    return {
      value: {},
    }
  }

  try {
    const parsed: unknown =
      JSON.parse(value)

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {
        error:
          'Config debe ser un objeto JSON. Por ejemplo: {}',
      }
    }

    return {
      value:
        parsed as Record<
          string,
          unknown
        >,
    }
  } catch {
    return {
      error:
        'El JSON de config no es válido.',
    }
  }
}

function nullableText(
  value:
    FormDataEntryValue | null
): string | null {

  if (
    typeof value !== 'string'
  ) {
    return null
  }

  const trimmed =
    value.trim()

  return trimmed === ''
    ? null
    : trimmed
}

export async function createBlockAction(
  _previousState:
    CreateBlockActionState,
  formData: FormData
): Promise<CreateBlockActionState> {

  const configResult =
    parseJsonObject(
      formData.get(
        'config'
      )
    )

  if (configResult.error) {
    return {
      fieldErrors: {
        config: [
          configResult.error,
        ],
      },
    }
  }

  const result =
    createContentBlockSchema
      .safeParse({
        contentId:
          formData.get(
            'contentId'
          ),

        type:
          formData.get(
            'type'
          ),

        sortOrder:
          Number(
            formData.get(
              'sortOrder'
            )
          ),

        config:
          configResult.value,
      })

  if (!result.success) {
    return {
      fieldErrors:
        result.error
          .flatten()
          .fieldErrors,
    }
  }

  try {
    await createContentBlock(
      result.data
    )
  } catch (error) {
    console.error(error)

    return {
      formError:
        'No se ha podido crear el bloque.',
    }
  }

  revalidatePath(
    `/admin/contents/${result.data.contentId}/edit`
  )

  return {
    success: true,
  }
}

export async function updateBlockAction(
  _previousState:
    UpdateBlockActionState,
  formData: FormData
): Promise<UpdateBlockActionState> {

  const configResult =
    parseJsonObject(
      formData.get(
        'config'
      )
    )

  if (configResult.error) {
    return {
      fieldErrors: {
        config: [
          configResult.error,
        ],
      },
    }
  }

  const result =
    updateContentBlockSchema
      .safeParse({
        id:
          formData.get(
            'id'
          ),

        sortOrder:
          Number(
            formData.get(
              'sortOrder'
            )
          ),

        config:
          configResult.value,
      })

  if (!result.success) {
    return {
      fieldErrors:
        result.error
          .flatten()
          .fieldErrors,
    }
  }

  try {
    await updateContentBlock(
      result.data
    )
  } catch (error) {
    console.error(error)

    return {
      formError:
        'No se ha podido actualizar el bloque.',
    }
  }

  const contentId =
    formData.get(
      'contentId'
    )

  if (
    typeof contentId === 'string'
  ) {
    revalidatePath(
      `/admin/contents/${contentId}/edit`
    )
  }

  return {
    success: true,
  }
}

export async function deleteBlockAction(
  _previousState:
    DeleteBlockActionState,
  formData: FormData
): Promise<DeleteBlockActionState> {

  const result =
    deleteContentBlockSchema
      .safeParse({
        id:
          formData.get(
            'id'
          ),
      })

  if (!result.success) {
    return {
      error:
        'El identificador del bloque no es válido.',
    }
  }

  try {
    await deleteContentBlock(
      result.data
    )
  } catch (error) {
    console.error(error)

    return {
      error:
        'No se ha podido eliminar el bloque.',
    }
  }

  const contentId =
    formData.get(
      'contentId'
    )

  if (
    typeof contentId === 'string'
  ) {
    revalidatePath(
      `/admin/contents/${contentId}/edit`
    )
  }

  return {}
}

export async function saveBlockTranslationAction(
  _previousState:
    BlockTranslationActionState,
  formData: FormData
): Promise<BlockTranslationActionState> {

  const result =
    contentBlockTranslationSchema
      .safeParse({
        blockId:
          formData.get(
            'blockId'
          ),

        locale:
          formData.get(
            'locale'
          ),

        bodyRichText:
          nullableText(
            formData.get(
              'bodyRichText'
            )
          ),

        caption:
          nullableText(
            formData.get(
              'caption'
            )
          ),

        quoteText:
          nullableText(
            formData.get(
              'quoteText'
            )
          ),
      })

  if (!result.success) {
    return {
      fieldErrors:
        result.error
          .flatten()
          .fieldErrors,
    }
  }

  try {
    await upsertContentBlockTranslation(
      result.data
    )
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes(
        'Content locale is not available'
      )
    ) {
      return {
        formError:
          'Este idioma no está disponible en el contenido.',
      }
    }

    return {
      formError:
        'No se ha podido guardar la traducción del bloque.',
    }
  }

  const contentId =
    formData.get(
      'contentId'
    )

  if (
    typeof contentId === 'string'
  ) {
    revalidatePath(
      `/admin/contents/${contentId}/edit`
    )
  }

  return {
    success: true,
  }
}