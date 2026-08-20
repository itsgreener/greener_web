import type {
  ContentType,
  CreateContentInput,
  DeleteContentInput,
  Locale,
  UpdateContentInput,
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

export type ContentDetail = {
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

  getById(
    id: string
  ): Promise<ContentDetail | null>

  createDraft(
    input: CreateContentInput
  ): Promise<string>

  update(
    input: UpdateContentInput
  ): Promise<string>

  delete(
    input: DeleteContentInput
  ): Promise<string>
}