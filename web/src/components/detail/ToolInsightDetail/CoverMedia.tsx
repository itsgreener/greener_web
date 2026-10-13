import {
  buildImageUrl,
  buildImageSrcSet,
  buildVideoPosterUrl,
  buildVideoSources,
} from '@/modules/media/client/cloudinaryUrl'
import type { PublicContentMedia } from '@/modules/content/domain/publicContent'
import { detailVideoRungM } from '@/modules/media/domain/mediaDelivery'
import type { PinRatioValue } from '@/modules/shared/domain/ratio'
import { ToolCoverVideo } from '@/components/detail/ToolCoverVideo'
import styles from './ToolInsightDetail.module.css'

/**
 * Portada de un detalle tipo A. Tres casos:
 * - imagen (cualquier tipo de contenido);
 * - vídeo de una tool: sustituye a la imagen en la MISMA caja (mudo, bucle,
 *   botón de pausa);
 * - vídeo de contenido libre (`other`): controles nativos, escalón M del
 *   contrato de medios §4.2 (dos fuentes explícitas, con tope de tamaño y
 *   conservando el audio).
 */
export function CoverMedia({
  media,
  title,
  alt,
  ratio,
  isTool,
  boxWidthPx,
  boxHeightPx,
}: {
  media: PublicContentMedia
  title: string
  // Alt del pin de origen; solo lo usa el vídeo de una tool.
  alt?: string | null
  ratio: PinRatioValue
  isTool: boolean
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

  if (isTool) {
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

  return (
    <video
      poster={buildVideoPosterUrl(
        media.cloudinaryPublicId,
        detailVideoRungM(ratio),
        'detail',
      )}
      controls
      aria-label={title}
      className={styles.coverImage}
    >
      {buildVideoSources(
        media.cloudinaryPublicId,
        'caseDetail',
        detailVideoRungM(ratio),
      ).map((source) => (
        <source key={source.type} src={source.src} type={source.type} />
      ))}
    </video>
  )
}
