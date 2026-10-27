import { AdminMediaItem } from '@/components/admin/AdminMediaItem'

import type { CarouselItem } from './types'

export function CarouselSlide({
  item,
  disabled,
  onRemove,
}: {
  item: CarouselItem
  disabled: boolean
  onRemove: () => void
}) {
  return (
    <AdminMediaItem
      image={
        item.kind === 'image'
          ? {
              publicId: item.cloudinaryPublicId,
              alt: item.alt,
            }
          : undefined
      }
      videoId={item.cloudinaryPublicId}
      caption={item.alt}
      disabled={disabled}
      onRemove={onRemove}
    />
  )
}
