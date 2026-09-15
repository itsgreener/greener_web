import Link from 'next/link'
import {
  buildImageUrl,
  buildImageSrcSet,
} from '@/modules/media/infrastructure/cloudinaryUrl'
import type { PublicContent } from '@/modules/content/infrastructure/publicContentSource'
import styles from './ToolInsightDetail.module.css'

/**
 * Plantilla de detalle tipo A (especificacion-final-formato-detalle.md
 * §1, §3), compartida por tool e insight — "el brief considera
 * técnicamente equivalentes insights y tools... la diferencia es de
 * negocio, no de aislamiento técnico" (arquitectura §12). Portada +
 * título + summary + CTA hacia el HTML real del paquete en /app.
 *
 * Primera versión, a propósito sin el panel de recomendaciones de
 * columnas (altura 66,7vh / ancho = altura × ratio / tope 83% del ancho
 * útil) — eso queda para una pasada de layout aparte; esta plantilla ya
 * es funcional sin él (ver PROGRESO.md).
 */
export function ToolInsightDetail({
  content,
  ctaLabel,
  appHref,
}: {
  content: PublicContent
  ctaLabel: 'Use' | 'Read'
  appHref: string
}) {
  return (
    <article className={styles.article}>
      {content.coverMedia && content.coverMedia.kind === 'image' && (
        <div className={styles.cover}>
          {/* eslint-disable-next-line @next/next/no-img-element -- URL ya
              transformada por modules/media/infrastructure/cloudinaryUrl.ts */}
          <img
            src={buildImageUrl(content.coverMedia.cloudinaryPublicId, 'detail')}
            srcSet={buildImageSrcSet(
              content.coverMedia.cloudinaryPublicId,
              'detail',
            )}
            sizes="100vw"
            alt={content.title}
            loading="eager"
            className={styles.coverImage}
          />
        </div>
      )}

      <div className={styles.text}>
        <h1 className={styles.title}>{content.title}</h1>
        {content.summary && <p className={styles.summary}>{content.summary}</p>}

        <Link href={appHref} className={styles.cta}>
          {ctaLabel}
        </Link>
      </div>
    </article>
  )
}
