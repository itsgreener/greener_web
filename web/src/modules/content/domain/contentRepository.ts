import type {
  ContentType,
  CreateContentInput,
  DeleteContentInput,
  Locale,
  PublishContentInput,
  ScheduleContentInput,
  UnpublishContentInput,
  UpdateContentInput,
} from './contentSchema'

export type ContentStatus = 'draft' | 'scheduled' | 'published'

export type ContentListItem = {
  id: string
  type: ContentType
  status: ContentStatus
  slug: string
  defaultLocale: Locale
  title: string
  createdAt: string
  publishAt: string | null
}

export type ContentDetail = {
  id: string
  type: ContentType
  status: ContentStatus
  slug: string
  defaultLocale: Locale
  title: string
  createdAt: string
  publishAt: string | null
  coverMedia: {
    id: string
    kind: 'image' | 'video'
    cloudinaryPublicId: string
  } | null
}

export interface ContentRepository {
  list(): Promise<ContentListItem[]>

  getById(id: string): Promise<ContentDetail | null>

  createDraft(input: CreateContentInput): Promise<string>

  update(input: UpdateContentInput): Promise<string>

  delete(input: DeleteContentInput): Promise<string>

  publish(input: PublishContentInput): Promise<string>

  schedule(input: ScheduleContentInput): Promise<string>

  unpublish(input: UnpublishContentInput): Promise<string>
}
