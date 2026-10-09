import { describe, expect, it } from 'vitest'

import { Constants } from '@/lib/supabase/database.types'
import { contentStatusSchema } from '@/modules/shared/domain/contentStatus'
import { contentTypeSchema } from '@/modules/shared/domain/contentType'
import { localeSchema } from '@/modules/shared/domain/locale'
import { mediaKindSchema } from '@/modules/shared/domain/mediaKind'
import { pinRatioSchema } from '@/modules/shared/domain/ratio'
import {
  episodeKindSchema,
  episodeProgramSchema,
  episodeProviderSchema,
} from '@/modules/content/domain/episodeSchema'
import { pinAutoplayModeSchema } from '@/modules/pin/domain/pinSchema'

/**
 * Fase 2: los conceptos de `shared/domain` (y los enums de episodio y pin)
 * son copias en zod de los enums de Postgres. Este test los compara con los
 * tipos generados (`npm run db:types`): si una migración añade o quita un
 * valor y se regeneran los tipos, falla aquí en vez de en producción.
 */
const ENUMS = Constants.public.Enums

function sorted(values: readonly string[]) {
  return [...values].sort()
}

describe('enums de zod frente a los de Postgres', () => {
  it.each([
    ['content_status', contentStatusSchema.options, ENUMS.content_status],
    ['content_type', contentTypeSchema.options, ENUMS.content_type],
    ['locale', localeSchema.options, ENUMS.locale],
    ['media_kind', mediaKindSchema.options, ENUMS.media_kind],
    ['pin_ratio', pinRatioSchema.options, ENUMS.pin_ratio],
    ['episode_kind', episodeKindSchema.options, ENUMS.episode_kind],
    ['episode_program', episodeProgramSchema.options, ENUMS.episode_program],
    ['episode_provider', episodeProviderSchema.options, ENUMS.episode_provider],
    [
      'pin_autoplay_mode',
      pinAutoplayModeSchema.options,
      ENUMS.pin_autoplay_mode,
    ],
  ])('%s', (_name, zodOptions, dbValues) => {
    expect(sorted(zodOptions)).toEqual(sorted(dbValues))
  })
})
