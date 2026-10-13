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
    <div>
      {item.kind === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={buildImageUrl(
            item.cloudinaryPublicId,
            'feed',
            ADMIN_THUMBNAIL_WIDTH,
          )}
          alt=""
          width={100}
          height={100}
        />
      ) : (
        <p>{item.cloudinaryPublicId} (vídeo)</p>
      )}

      <button type="button" onClick={onRemove}>
        Quitar
      </button>
    </div>
  )
}
