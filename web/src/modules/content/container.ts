import 'server-only'

import { cache } from 'react'

import { env } from '@/lib/env'
import { createServiceClient } from '@/lib/supabase/serviceClient'
import {
  mediaAssets,
  mediaCleanup,
  mediaVerifier,
  warmScheduler,
} from '@/modules/media/container'

import {
  makeAddCaseCarouselImage,
  makeAddCaseCarouselVideo,
} from './application/addCaseCarouselMedia'
import { makeCreateContent } from './application/createContent'
import { makeDeleteContent } from './application/deleteContent'
import { makeGeneratePreviewLink } from './application/generatePreviewLink'
import {
  makePublishContent,
  makeScheduleContent,
} from './application/publishContent'
import {
  makeRemoveAllCaseCarouselMedia,
  makeRemoveCaseCarouselMedia,
} from './application/removeCaseCarouselMedia'
import { makeResolvePreviewContext } from './application/resolvePreviewContext'
import { resolveDetailCover } from './application/resolveDetailCover'
import { makeUnpublishContent } from './application/unpublishContent'
import { makeUpdateContent } from './application/updateContent'
import { makeUpsertCaseDetail } from './application/upsertCaseDetail'
import { makeUpsertContentTranslation } from './application/upsertContentTranslation'
import { makeUpsertEpisode } from './application/upsertEpisode'
import {
  decodePreviewToken,
  encodePreviewToken,
} from './infrastructure/previewToken'
import { supabaseCaseCarouselRepository } from './infrastructure/supabaseCaseCarouselRepository'
import { supabaseCaseDetailRepository } from './infrastructure/supabaseCaseDetailRepository'
import { supabaseContentRepository } from './infrastructure/supabaseContentRepository'
import { supabaseContentTranslationRepository } from './infrastructure/supabaseContentTranslationRepository'
import { supabaseEpisodeRepository } from './infrastructure/supabaseEpisodeRepository'
import { requestScopedReader } from './infrastructure/requestScopedReader'
import { createSupabasePublicContentReader } from './infrastructure/supabasePublicContentReader'

/**
 * Composition root del módulo de contenidos. Ver `media/container.ts`.
 *
 * Las lecturas del ABM (lista, detalle, traducciones, caso, episodio,
 * carrusel) se piden directamente a los repositorios: no hay caso de uso
 * intermedio que solo las reenvíe.
 */

export const contents = supabaseContentRepository

export const caseDetails = supabaseCaseDetailRepository

export const caseCarousels = supabaseCaseCarouselRepository

export const contentTranslations = supabaseContentTranslationRepository

export const episodes = supabaseEpisodeRepository

export const createContent = makeCreateContent({ contents })

export const updateContent = makeUpdateContent({ contents })

export const deleteContent = makeDeleteContent({
  contents,
  cleanup: mediaCleanup,
})

export const publishContent = makePublishContent({
  contents,
  warm: warmScheduler,
})

export const scheduleContent = makeScheduleContent({
  contents,
  warm: warmScheduler,
})

export const unpublishContent = makeUnpublishContent({ contents })

export const upsertCaseDetail = makeUpsertCaseDetail({
  caseDetails,
})

export const upsertContentTranslation = makeUpsertContentTranslation({
  translations: contentTranslations,
})

export const upsertEpisode = makeUpsertEpisode({ episodes })

export const addCaseCarouselImage = makeAddCaseCarouselImage({
  media: mediaAssets,
  verifier: mediaVerifier,
})

export const addCaseCarouselVideo = makeAddCaseCarouselVideo({
  media: mediaAssets,
  verifier: mediaVerifier,
  warm: warmScheduler,
})

export const removeCaseCarouselMedia = makeRemoveCaseCarouselMedia({
  media: mediaAssets,
  cleanup: mediaCleanup,
})

export const removeAllCaseCarouselMedia = makeRemoveAllCaseCarouselMedia({
  carousels: caseCarousels,
  media: mediaAssets,
  cleanup: mediaCleanup,
})

/**
 * Lector de la web pública: solo ve lo publicado. Memoriza por petición, así
 * que la metadata y la página de una ficha no repiten lecturas.
 */
export const publicContent = requestScopedReader(
  createSupabasePublicContentReader(),
)

/**
 * `cache` hace que `generateMetadata` y la página reciban la MISMA
 * resolución (mismo lector, una sola lectura del contenido por petición).
 */
export const resolvePreviewContext = cache(
  makeResolvePreviewContext({
    publicReader: publicContent,
    previewReader: () =>
      requestScopedReader(
        createSupabasePublicContentReader(createServiceClient()),
      ),
    decodePreviewToken,
  }),
)

/**
 * Portada de la ficha de una tool o un insight: el pin de `?pin=` o, si no, el
 * primer pin. Función pura sobre el lector que devuelve `resolvePreviewContext`.
 */
export { resolveDetailCover }

export const generatePreviewLink = makeGeneratePreviewLink({
  contents,
  encodePreviewToken,
  siteUrl: env.NEXT_PUBLIC_SITE_URL,
})
