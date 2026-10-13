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
    <div>
      {item.kind === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={buildImageUrl(
            item.cloudinaryPublicId,
            'feed',
            ADMIN_THUMBNAIL_WIDTH,
          )}
          alt={item.alt}
          width={100}
          height={100}
        />
      ) : (
        <p>{item.cloudinaryPublicId} (vídeo)</p>
      )}

      <p>{item.alt}</p>

      <button type="button" disabled={disabled} onClick={onRemove}>
        Quitar
      </button>
    </div>
  )
}
