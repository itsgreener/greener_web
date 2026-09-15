export type CaseCarouselItem = {
  mediaId: string
  kind: 'image' | 'video'
  cloudinaryPublicId: string
  sortOrder: number
  alt: string
}

export interface CaseCarouselRepository {
  listByContentId(contentId: string): Promise<CaseCarouselItem[]>
}
