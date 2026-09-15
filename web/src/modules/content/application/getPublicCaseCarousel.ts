import { getPublicCaseCarousel as getPublicCaseCarouselSource } from '../infrastructure/publicCaseSource'

export async function getPublicCaseCarousel(contentId: string) {
  return getPublicCaseCarouselSource(contentId)
}
