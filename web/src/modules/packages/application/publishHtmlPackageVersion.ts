import { z } from 'zod'

import { supabaseHtmlPackageRepository } from '../infrastructure/supabaseHtmlPackageRepository'

export const publishHtmlPackageVersionSchema = z.object({
  contentId: z.string().uuid('El identificador del contenido no es válido'),
  versionId: z.string().uuid('El identificador de la versión no es válido'),
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
