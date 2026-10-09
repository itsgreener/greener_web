import { z } from 'zod'

import { supabaseHtmlPackageRepository } from '../infrastructure/supabaseHtmlPackageRepository'
import { idSchema } from '@/lib/validation/idSchema'

export const publishHtmlPackageVersionSchema = z.object({
  contentId: idSchema('content'),
  versionId: idSchema('version'),
})

export type PublishHtmlPackageVersionInput = z.infer<
  typeof publishHtmlPackageVersionSchema
>

export async function publishHtmlPackageVersion(
  input: PublishHtmlPackageVersionInput,
) {
  const validated = publishHtmlPackageVersionSchema.parse(input)

  return supabaseHtmlPackageRepository.publishVersion(validated)
}
