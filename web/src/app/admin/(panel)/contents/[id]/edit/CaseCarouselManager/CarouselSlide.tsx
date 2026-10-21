import { AdminMediaItem } from '@/components/admin/AdminMediaItem'
import { buildImageUrl } from '@/modules/media/client/cloudinaryUrl'
import { ADMIN_THUMBNAIL_WIDTH } from '@/modules/media/domain/mediaDelivery'

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
              src: buildImageUrl(
                item.cloudinaryPublicId,
                'feed',
                ADMIN_THUMBNAIL_WIDTH,
              ),
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
