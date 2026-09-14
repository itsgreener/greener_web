export type CaseCarouselItem = {
  mediaId: string
  kind: 'image' | 'video'
  cloudinaryPublicId: string
  sortOrder: number
}

export interface CaseCarouselRepository {
  listByContentId(contentId: string): Promise<CaseCarouselItem[]>
}
