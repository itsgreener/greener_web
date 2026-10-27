'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import {
  buildVideoPosterUrl,
  buildVideoSources,
} from '@/modules/media/client/cloudinaryUrl'
import { cssAspectRatio } from '@/modules/shared/domain/ratio'
import { widestCarouselRatio } from '@/modules/media/domain/closestRatio'
import { caseVideoRatio } from '@/modules/media/domain/detailVideoRatio'
import { detailVideoRungM } from '@/modules/media/domain/mediaDelivery'
import { RecommendationsGrid } from '@/components/detail/RecommendationsGrid'
import {
  CloudinaryImage,
  DETAIL_IMAGE_SIZES,
} from '@/components/media/CloudinaryImage'
import { useRecommendationMasonry } from '@/components/detail/useRecommendationMasonry'
import { workLocalePath } from '@/modules/content/domain/contentPath'
import type { PublicContent } from '@/modules/content/domain/publicContent'
import { localeCode } from '@/modules/shared/domain/locale'
import type {
  PublicCaseDetail,
  PublicCaseCarouselItem,
} from '@/modules/content/domain/publicContent'
import styles from './CaseDetail.module.css'

// Fuera de la lista cerrada solo cuando no hay carrusel todavía — un caso
// siempre trae 1-N medios en la práctica (§3), pero la página no debe
// romper si un caso se publica sin carrusel por error de carga.
const FALLBACK_RATIO = '16:9' as const

/**
 * Vídeo del carrusel de un caso (contrato de medios §4.2): escalón M del
 * ratio PROPIO del vídeo, dos fuentes explícitas (WebM/VP9 y MP4/H.264) y
 * el audio conservado (lleva controles).
 */
function CarouselVideo({ item }: { item: PublicCaseCarouselItem }) {
  const size = detailVideoRungM(caseVideoRatio(item.width, item.height))

  return (
    <video
      poster={buildVideoPosterUrl(item.cloudinaryPublicId, size, 'detail')}
      controls
      aria-label={item.alt}
      className={styles.media}
    >
      {buildVideoSources(item.cloudinaryPublicId, 'caseDetail', size).map(
        (source) => (
          <source key={source.type} src={source.src} type={source.type} />
        ),
      )}
    </video>
  )
}

/**
 * Plantilla de detalle tipo B para un caso (especificacion-final-formato-
 * detalle.md §1, §2, §3): contenido siempre a 6/6 (fullWidthContent),
 * sin panel lateral — las recomendaciones usan siempre el scope `home`
 * (`RECOMMENDATIONS_SCOPE` en `useRecommendationMasonry`, desde el 14 oct
 * 2026), excluyéndose a sí mismo, y solo pueden aparecer debajo.
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
  // El carrusel entero usa el ratio del medio MÁS
  // ANCHO para todas las diapositivas por igual — el resto se encaja con
  // barras negras (object-fit: contain) en vez de recortarse. Se calcula
  // UNA sola vez a partir de los datos ya cargados por el servidor.
  const carouselRatio =
    carousel.length > 0 ? widestCarouselRatio(carousel) : FALLBACK_RATIO

  const recommendations = useRecommendationMasonry(content.id, carouselRatio, {
    fullWidthContent: true,
  })
  const { contentBlockImageWidth, contentBlockImageHeight } = recommendations

  return (
    <article className={styles.article}>
      <div className={styles.contentBlock}>
        {carousel.length > 0 && (
          <div
            className={styles.carousel}
            style={{
              width: contentBlockImageWidth || '100%',
              height: contentBlockImageHeight || undefined,
            }}
          >
            {carousel.map((item, index) => (
              <div
                key={item.mediaId}
                className={styles.slide}
                style={
                  { '--ratio': cssAspectRatio(carouselRatio) } as CSSProperties
                }
              >
                {item.kind === 'image' ? (
                  <CloudinaryImage
                    publicId={item.cloudinaryPublicId}
                    kind="image"
                    profile="detail"
                    sizes={DETAIL_IMAGE_SIZES}
                    alt={item.alt}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    className={styles.media}
                  />
                ) : (
                  <CarouselVideo item={item} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className={styles.text}>
          {/* Selector de idioma (arquitectura §7.7): solo se muestra si hay
              más de una traducción publicada — nunca los tres locales por
              defecto. Un único elemento (el caso normal) no pinta nada. */}
          {content.availableLocales.length > 1 && (
            <nav className={styles.localeSelector} aria-label="Language">
              {content.availableLocales.map((loc) => (
                <Link
                  key={loc}
                  href={workLocalePath(
                    content.slug,
                    loc,
                    content.defaultLocale,
                  )}
                  aria-current={loc === content.locale ? 'page' : undefined}
                  className={styles.localeLink}
                >
                  {localeCode(loc)}
                </Link>
              ))}
            </nav>
          )}

          {caseDetail?.client && (
            <p className={styles.client}>{caseDetail.client}</p>
          )}
          <h1 className={`${styles.title} text-display`}>{content.title}</h1>
          {content.highlight && (
            <p className={styles.highlight}>{content.highlight}</p>
          )}
          {content.body && <p className={styles.body}>{content.body}</p>}
        </div>
      </div>

      <RecommendationsGrid recommendations={recommendations} />
    </article>
  )
}
