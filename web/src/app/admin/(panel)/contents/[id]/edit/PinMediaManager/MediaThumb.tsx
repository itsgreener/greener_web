import { AdminMediaItem } from '@/components/admin/AdminMediaItem'
import { buildImageUrl } from '@/modules/media/client/cloudinaryUrl'
import { ADMIN_THUMBNAIL_WIDTH } from '@/modules/media/domain/mediaDelivery'

import type { PinMedia } from './types'

export function MediaThumb({
  item,
  onRemove,
}: {
  item: PinMedia
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
              alt: '',
            }
          : undefined
      }
      videoId={item.cloudinaryPublicId}
      onRemove={onRemove}
    />
  )
}
