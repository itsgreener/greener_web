import {
  buildImageUrl,
  buildImageSrcSet,
} from '@/modules/media/client/cloudinaryUrl'
import type { PublicContentMedia } from '@/modules/content/domain/publicContent'
import type { PinRatioValue } from '@/modules/shared/domain/ratio'
import { ToolCoverVideo } from '@/components/detail/ToolCoverVideo'
import styles from './ToolInsightDetail.module.css'

/**
 * Medio de cabecera de un detalle tipo A: una imagen, o un vídeo que
 * sustituye a la imagen en la MISMA caja (mudo, bucle, botón de pausa).
 */
export function CoverMedia({
  media,
  title,
  alt,
  ratio,
  boxWidthPx,
  boxHeightPx,
}: {
  media: PublicContentMedia
  title: string
  // Alt del pin de origen; solo lo usa el vídeo.
  alt?: string | null
  ratio: PinRatioValue
  boxWidthPx: number
  boxHeightPx: number
}) {
  if (media.kind === 'image') {
    return (
      // URL ya transformada por modules/media/client/cloudinaryUrl.ts
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={buildImageUrl(media.cloudinaryPublicId, 'detail')}
        srcSet={buildImageSrcSet(media.cloudinaryPublicId, 'detail')}
        sizes="83vw"
        alt={title}
        loading="eager"
        className={styles.coverImage}
      />
    )
  }

  return (
    <ToolCoverVideo
      publicId={media.cloudinaryPublicId}
      alt={alt || title}
      ratio={ratio}
      boxWidthPx={boxWidthPx}
      boxHeightPx={boxHeightPx}
    />
  )
}
