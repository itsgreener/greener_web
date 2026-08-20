import type {
  ContentType,
  CreateContentInput,
  Locale,
} from './contentSchema'

export type ContentStatus =
  | 'draft'
  | 'scheduled'
  | 'published'

export type ContentListItem = {
  id: string
  type: ContentType
  status: ContentStatus
  slug: string
  defaultLocale: Locale
  title: string
  createdAt: string
}

export interface ContentRepository {
  list(): Promise<ContentListItem[]>

  createDraft(
    input: CreateContentInput
  ): Promise<string>
}