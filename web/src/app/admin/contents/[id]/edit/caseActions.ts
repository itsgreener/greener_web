'use server'

import {
  revalidatePath,
} from 'next/cache'

import {
  caseDetailSchema,
} from '@/modules/content/domain/caseDetailSchema'

import {
  upsertCaseDetail,
} from '@/modules/content/application/upsertCaseDetail'

export type CaseDetailActionState = {
  fieldErrors?: {
    contentId?: string[]
    templateVariant?: string[]
    force?: string[]
    client?: string[]
    sector?: string[]
    services?: string[]
    year?: string[]
    credits?: string[]
    links?: string[]
  }

  formError?: string
  success?: boolean
}

type JsonArrayParseResult =
  | {
      value: unknown[]
      error?: undefined
    }
  | {
      value?: undefined
      error: string
    }

function nullableText(
  value: FormDataEntryValue | null
): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed =
    value.trim()

  if (!trimmed) {
    return null
  }

  return trimmed
}

function parseJsonArray(
  value: FormDataEntryValue | null
): JsonArrayParseResult {
  if (
    typeof value !== 'string' ||
    value.trim() === ''
  ) {
    return {
      value: [],
    }
  }

  try {
    const parsed: unknown =
      JSON.parse(value)

    if (!Array.isArray(parsed)) {
      return {
        error:
          'Debe ser un array JSON. Por ejemplo: []',
      }
    }

    return {
      value: parsed,
    }
  } catch {
    return {
      error:
        'El JSON no es válido.',
    }
  }
}

export async function saveCaseDetailAction(
  _previousState:
    CaseDetailActionState,
  formData: FormData
): Promise<CaseDetailActionState> {

  const creditsResult =
    parseJsonArray(
      formData.get('credits')
    )

  const linksResult =
    parseJsonArray(
      formData.get('links')
    )

  if (
    creditsResult.error ||
    linksResult.error
  ) {
    return {
      fieldErrors: {
        credits:
          creditsResult.error
            ? [
                creditsResult.error,
              ]
            : undefined,

        links:
          linksResult.error
            ? [
                linksResult.error,
              ]
            : undefined,
      },
    }
  }

  const rawYear =
    formData.get('year')

  const result =
    caseDetailSchema.safeParse({
      contentId:
        formData.get(
          'contentId'
        ),

      templateVariant:
        formData.get(
          'templateVariant'
        ),

      force:
        Number(
          formData.get(
            'force'
          )
        ),

      client:
        nullableText(
          formData.get(
            'client'
          )
        ),

      sector:
        nullableText(
          formData.get(
            'sector'
          )
        ),

      services:
        nullableText(
          formData.get(
            'services'
          )
        ),

      year:
        typeof rawYear ===
          'string' &&
        rawYear.trim() !== ''
          ? Number(rawYear)
          : null,

      credits:
        creditsResult.value,

      links:
        linksResult.value,
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
    await upsertCaseDetail(
      result.data
    )
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes(
        'Content is not a case'
      )
    ) {
      return {
        formError:
          'Este contenido no es de tipo Case.',
      }
    }

    if (
      error instanceof Error &&
      error.message.includes(
        'Content not found'
      )
    ) {
      return {
        formError:
          'El contenido ya no existe.',
      }
    }

    return {
      formError:
        'No se han podido guardar los datos del Case.',
    }
  }

  revalidatePath(
    `/admin/contents/${result.data.contentId}/edit`
  )

  return {
    success: true,
  }
}