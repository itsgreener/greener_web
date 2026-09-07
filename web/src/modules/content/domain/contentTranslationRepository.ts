import type {
  ContentTranslation,
  UpsertContentTranslationInput,
} from './contentTranslationSchema'

export interface ContentTranslationRepository {
  listByContentId(contentId: string): Promise<ContentTranslation[]>

  upsert(input: UpsertContentTranslationInput): Promise<string>
}
