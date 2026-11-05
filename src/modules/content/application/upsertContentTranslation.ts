import {
  contentTranslationSchema,
  type UpsertContentTranslationInput,
} from '@/modules/content/domain/contentTranslationSchema'
import type { ContentTranslationRepository } from '@/modules/content/domain/contentTranslationRepository'

export function makeUpsertContentTranslation({
  translations,
}: {
  translations: ContentTranslationRepository
}) {
  return async function upsertContentTranslation(
    input: UpsertContentTranslationInput,
  ) {
    const validated = contentTranslationSchema.parse(input)

    return translations.upsert(validated)
  }
}
