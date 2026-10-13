import type {
  CreateContentInput,
  DeleteContentInput,
  PublishContentInput,
  ScheduleContentInput,
  UnpublishContentInput,
  UpdateContentInput,
} from './contentSchema'
import type { ContentType } from '@/modules/shared/domain/contentType'
import type { Locale } from '@/modules/shared/domain/locale'
import type { ContentStatus } from '@/modules/shared/domain/contentStatus'
import type { ContentListQuery } from './contentListQuery'

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

export type ContentListPage = {
  items: ContentListItem[]
  /** Total que cumple los filtros (no solo los de esta página). */
  total: number
}

export type ContentCounts = Record<ContentStatus, number>

export interface ContentRepository {
  /** Una página de la lista, más reciente primero, ya filtrada. */
  list(query: ContentListQuery): Promise<ContentListPage>

  /** Cuántos contenidos hay en cada estado, sin traerlos. */
  counts(): Promise<ContentCounts>

  getById(id: string): Promise<ContentDetail | null>

  createDraft(input: CreateContentInput): Promise<string>

  update(input: UpdateContentInput): Promise<string>

  delete(input: DeleteContentInput): Promise<string>

  publish(input: PublishContentInput): Promise<string>

  schedule(input: ScheduleContentInput): Promise<string>

  unpublish(input: UnpublishContentInput): Promise<string>
}
