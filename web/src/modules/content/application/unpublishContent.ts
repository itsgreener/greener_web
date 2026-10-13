import {
  unpublishContentSchema,
  type UnpublishContentInput,
} from '@/modules/content/domain/contentSchema'
import type { ContentRepository } from '@/modules/content/domain/contentRepository'

export function makeUnpublishContent({
  contents,
}: {
  contents: ContentRepository
}) {
  return async function unpublishContent(input: UnpublishContentInput) {
    const validated = unpublishContentSchema.parse(input)

    return contents.unpublish(validated)
  }
}
