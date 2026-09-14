import { supabaseCaseCarouselRepository } from '../infrastructure/supabaseCaseCarouselRepository'

export async function getCaseCarousel(contentId: string) {
  return supabaseCaseCarouselRepository.listByContentId(contentId)
}
