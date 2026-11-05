export type CarouselItem = {
  mediaId: string
  kind: 'image' | 'video'
  cloudinaryPublicId: string
  sortOrder: number
  alt: string
}

export type CaseCarouselManagerProps = {
  contentId: string
  items: CarouselItem[]
}
