import type {
  HtmlPackageRepository,
  PublishHtmlPackageVersionInput,
} from '@/modules/packages/domain/htmlPackageRepository'
import { publishHtmlPackageVersionSchema } from '@/modules/packages/domain/packageVersionSchema'

export function makePublishHtmlPackageVersion({
  packages,
}: {
  packages: HtmlPackageRepository
}) {
  return async function publishHtmlPackageVersion(
    input: PublishHtmlPackageVersionInput,
  ) {
    const validated = publishHtmlPackageVersionSchema.parse(input)

    return packages.publishVersion(validated)
  }
}
