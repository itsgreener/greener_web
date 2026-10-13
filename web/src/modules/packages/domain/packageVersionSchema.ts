import { z } from 'zod'

import { idSchema } from '@/lib/validation/idSchema'

export const publishHtmlPackageVersionSchema = z.object({
  contentId: idSchema('content'),
  versionId: idSchema('version'),
})

export const deleteHtmlPackageVersionSchema = z.object({
  contentId: idSchema('content'),
  versionId: idSchema('version'),
})
