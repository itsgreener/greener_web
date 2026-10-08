'use client'

import Link from 'next/link'
import {
  buildImageUrl,
  buildImageSrcSet,
  buildVideoPosterUrl,
  buildVideoSources,
} from '@/modules/media/infrastructure/cloudinaryUrl'
import { widestCarouselRatio } from '@/modules/media/domain/closestRatio'
import { caseVideoRatio } from '@/modules/media/domain/detailVideoRatio'
import { detailVideoRungM } from '@/modules/media/domain/mediaDelivery'
import { PinCard } from '@/components/pin/PinCard'
import { useRecommendationMasonry } from '@/components/detail/useRecommendationMasonry'
import type { PublicContent } from '@/modules/content/infrastructure/publicContentSource'
import type {
  PublicCaseDetail,
  PublicCaseCarouselItem,
} from '@/modules/content/infrastructure/publicCaseSource'
import styles from './CaseDetail.module.css'

// especificacion-final-formato-detalle.md §2 — decisión del 21 de
// septiembre: css `aspect-ratio` usa la sintaxis "ancho / alto", el
// enum del proyecto usa "ancho:alto" — esta tabla es la única
// traducción entre los dos formatos, no una lista de ratios nueva.
const CSS_ASPECT_RATIO: Record<string, string> = {
  '1:1': '1 / 1',
  '4:3': '4 / 3',
  '4:5': '4 / 5',
  '3:4': '3 / 4',
  '2:3': '2 / 3',
  '9:16': '9 / 16',
  '16:9': '16 / 9',
}

// Fuera de la lista cerrada solo cuando no hay carrusel todavía — un caso
// siempre trae 1-N medios en la práctica (§3), pero la página no debe
// romper si un caso se publica sin carrusel por error de carga.
const FALLBACK_RATIO = '16:9' as const

/**
 * Vídeo del carrusel de un caso (contrato de medios §4.2): escalón M del
 * ratio PROPIO del vídeo, dos fuentes explícitas (WebM/VP9 y MP4/H.264) y
 * el audio conservado (lleva controles). Antes se servía el original sin
 * tope (hasta 180 s y 100 MB).
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
 * sin panel lateral — las recomendaciones usan scope='work' (solo Cases),
 * excluyéndose a sí mismo, y solo pueden aparecer debajo.
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
  // Decisión del 21 sep: el carrusel entero usa el ratio del medio MÁS
  // ANCHO para todas las diapositivas por igual — el resto se encaja con
  // barras negras (object-fit: contain) en vez de recortarse. Se calcula
  // UNA sola vez a partir de los datos ya cargados por el servidor.
  const carouselRatio =
    carousel.length > 0 ? widestCarouselRatio(carousel) : FALLBACK_RATIO

  const {
    containerRef,
    contentBlockImageWidth,
    contentBlockImageHeight,
    totalHeight,
    positioned,
    isLoading,
    itemCount,
    hasMore,
    error,
    sentinelId,
  } = useRecommendationMasonry(content.id, carouselRatio, {
    fullWidthContent: true,
    scope: 'work',
  })

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
                style={{
                  aspectRatio: CSS_ASPECT_RATIO[carouselRatio],
                }}
              >
                {item.kind === 'image' ? (
                  // URL ya transformada por
                  // modules/media/infrastructure/cloudinaryUrl.ts
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={buildImageUrl(item.cloudinaryPublicId, 'detail')}
                    srcSet={buildImageSrcSet(item.cloudinaryPublicId, 'detail')}
                    sizes="83vw"
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
            <nav className={styles.localeSelector} aria-label="Idioma">
              {content.availableLocales.map((loc) => (
                <Link
                  key={loc}
                  href={
                    loc === content.defaultLocale
                      ? `/work/${content.slug}`
                      : `/work/${content.slug}/${loc}`
                  }
                  aria-current={loc === content.locale ? 'page' : undefined}
                  className={styles.localeLink}
                >
                  {loc.toUpperCase()}
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

      <div
        ref={containerRef}
        className={styles.canvas}
        style={{ height: totalHeight || undefined }}
      >
        {positioned.map((p) => (
          <PinCard
            key={p.key}
            pin={p.item}
            instanceId={p.key}
            style={{ x: p.x, y: p.y, width: p.width, height: p.height }}
            analyticsContext={{
              section: 'recommendations',
              destinationType: p.item.kind,
            }}
          />
        ))}
      </div>

      <div id={sentinelId} className={styles.sentinel} />

      {error && <p className={styles.status}>{error}</p>}
      {isLoading && itemCount === 0 && (
        <p className={styles.status}>Cargando recomendaciones…</p>
      )}
      {!isLoading && itemCount === 0 && !hasMore && (
        <p className={styles.status}>
          Todavía no hay contenido publicado para recomendar.
        </p>
      )}
    </article>
  )
}
