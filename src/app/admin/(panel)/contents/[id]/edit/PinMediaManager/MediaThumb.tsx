import { AdminMediaItem } from '@/components/admin/AdminMediaItem'

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
              publicId: item.cloudinaryPublicId,
              alt: '',
            }
          : undefined
      }
      videoId={item.cloudinaryPublicId}
      onRemove={onRemove}
    />
  )
}
