import {
  buildImageUrl,
  buildImageSrcSet,
  buildVideoFullUrl,
  buildVideoPosterUrl,
} from '@/modules/media/infrastructure/cloudinaryUrl'
import type { PublicContent } from '@/modules/content/infrastructure/publicContentSource'
import type {
  PublicCaseDetail,
  PublicCaseCarouselItem,
} from '@/modules/content/infrastructure/publicCaseSource'
import styles from './CaseDetail.module.css'

/**
 * Plantilla de detalle tipo B para un caso (especificacion-final-formato-
 * detalle.md §1, §3): siempre a ancho completo, sin panel de
 * recomendaciones (eso es solo tipo A/other).
 */
export function CaseDetail({
  content,
  caseDetail,
  carousel,
}: {
  content: PublicContent
  caseDetail: PublicCaseDetail | null
  carousel: PublicCaseCarouselItem[]
}) {
  return (
    <article className={styles.article}>
      {carousel.length > 0 && (
        <div className={styles.carousel}>
          {carousel.map((item, index) => (
            <div key={item.mediaId} className={styles.slide}>
              {item.kind === 'image' ? (
                // URL ya transformada por
                // modules/media/infrastructure/cloudinaryUrl.ts
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={buildImageUrl(item.cloudinaryPublicId, 'detail')}
                  srcSet={buildImageSrcSet(item.cloudinaryPublicId, 'detail')}
                  sizes="100vw"
                  alt={item.alt}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  className={styles.media}
                />
              ) : (
                <video
                  src={buildVideoFullUrl(item.cloudinaryPublicId)}
                  poster={buildVideoPosterUrl(item.cloudinaryPublicId)}
                  controls
                  aria-label={item.alt}
                  className={styles.media}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className={styles.text}>
        {caseDetail?.client && (
          <p className={styles.client}>{caseDetail.client}</p>
        )}
        <h1 className={styles.title}>{content.title}</h1>
        {content.highlight && (
          <p className={styles.highlight}>{content.highlight}</p>
        )}
        {content.body && <p className={styles.body}>{content.body}</p>}
      </div>
    </article>
  )
}
