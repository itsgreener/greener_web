import {
  updateContentSchema,
  type UpdateContentInput,
} from '@/modules/content/domain/contentSchema'
import type { ContentRepository } from '@/modules/content/domain/contentRepository'

export function makeUpdateContent({
  contents,
}: {
  contents: ContentRepository
}) {
  return async function updateContent(input: UpdateContentInput) {
    const validated = updateContentSchema.parse(input)

    return contents.update(validated)
  }
}
