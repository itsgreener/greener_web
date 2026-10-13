import { buildImageUrl } from '@/modules/media/client/cloudinaryUrl'
import { ADMIN_THUMBNAIL_WIDTH } from '@/modules/media/domain/mediaDelivery'

import type { CoverMedia } from './types'

export function CoverPreview({
  coverMedia,
}: {
  coverMedia: CoverMedia | null
}) {
  if (!coverMedia) return <p>Todavía no hay portada.</p>

  return (
    <div>
      {coverMedia.kind === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={buildImageUrl(
            coverMedia.cloudinaryPublicId,
            'feed',
            ADMIN_THUMBNAIL_WIDTH,
          )}
          alt=""
          width={200}
          height={200}
        />
      ) : (
        <p>{coverMedia.cloudinaryPublicId} (vídeo)</p>
      )}
    </div>
  )
}
