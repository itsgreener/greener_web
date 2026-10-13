import {
  createContentSchema,
  type CreateContentInput,
} from '@/modules/content/domain/contentSchema'
import type { ContentRepository } from '@/modules/content/domain/contentRepository'

export function makeCreateContent({
  contents,
}: {
  contents: ContentRepository
}) {
  return async function createContent(input: CreateContentInput) {
    const validated = createContentSchema.parse(input)

    return contents.createDraft(validated)
  }
}
