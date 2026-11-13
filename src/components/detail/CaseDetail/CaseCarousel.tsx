'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import {
  buildVideoPosterUrl,
  buildVideoSources,
} from '@/modules/media/client/cloudinaryUrl'
import { cssAspectRatio } from '@/modules/shared/domain/ratio'
import { caseVideoRatio } from '@/modules/media/domain/detailVideoRatio'
import { detailVideoRungM } from '@/modules/media/domain/mediaDelivery'
import {
  CloudinaryImage,
  DETAIL_IMAGE_SIZES,
} from '@/components/media/CloudinaryImage'
import { useMotionPreferences } from '@/lib/useMotionPreferences'
import type { PublicCaseCarouselItem } from '@/modules/content/domain/publicContent'
import { visibleDots } from './carouselDots'
import { useSlidePaging } from './useSlidePaging'
import styles from './CaseCarousel.module.css'

/**
 * Vídeo del carrusel de un caso (contrato de medios §4.2): escalón M del
 * ratio PROPIO del vídeo, dos fuentes explícitas (WebM/VP9 y MP4/H.264) y
 * el audio conservado (lleva controles).
 *
 * `preload`: solo la primera diapositiva pide los metadatos (duración y
 * dimensiones) y solo si el visitante no ha pedido ahorrar datos ni tiene una
 * conexión lenta. El resto no se ve hasta que se desliza, y con póster y
 * controles `none` no deja ningún hueco: el vídeo se pide al pulsar play.
 */
function CarouselVideo({
  item,
  isFirstSlide,
}: {
  item: PublicCaseCarouselItem
  isFirstSlide: boolean
}) {
  const size = detailVideoRungM(caseVideoRatio(item.width, item.height))
  const { saveData, slowConnection } = useMotionPreferences()
  const preload =
    isFirstSlide && !saveData && !slowConnection ? 'metadata' : 'none'

  return (
    <video
      poster={buildVideoPosterUrl(item.cloudinaryPublicId, size, 'detail')}
      preload={preload}
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

/** Chevron de las flechas: hereda el color del botón (`currentColor`). */
function ArrowIcon({ direction }: { direction: 'previous' | 'next' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={direction === 'previous' ? 'M15 5 8 12l7 7' : 'm9 5 7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Carrusel de la ficha de un caso: scroll nativo con una diapositiva por
 * gesto (`useSlidePaging`), dos flechas dentro de la imagen (a media altura,
 * una en cada lateral; la del extremo se oculta en la primera y en la última
 * diapositiva) y, bajo las diapositivas, puntos que marcan la visible y
 * permiten saltar. Hasta 7 diapositivas, un punto por cada una; con más, una
 * ventana deslizante de 7 (`carouselDots.ts`). Con una sola diapositiva no se
 * pintan ni los puntos ni las flechas.
 *
 * El ancho y el alto los fija la ficha (`width`, `height`, en píxeles útiles
 * × ratio, especificacion-final-formato-detalle.md §2): el alto es el de las
 * diapositivas; los puntos van debajo y suman su propia altura.
 */
export function CaseCarousel({
  carousel,
  ratio,
  width,
  height,
}: {
  carousel: PublicCaseCarouselItem[]
  ratio: Parameters<typeof cssAspectRatio>[0]
  width: number | string
  height: number | undefined
}) {
  const { trackRef, active, goTo, step } = useSlidePaging(carousel.length)
  const previousRef = useRef<HTMLButtonElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const focusAfterRef = useRef<'previous' | 'next' | null>(null)

  const lastIndex = carousel.length - 1
  const hasPrevious = active > 0
  const hasNext = active < lastIndex

  const onPrevious = () => {
    if (step(-1) === 0) focusAfterRef.current = 'next'
  }
  const onNext = () => {
    if (step(1) === lastIndex) focusAfterRef.current = 'previous'
  }

  // La flecha que llega al extremo desaparece: el foco pasa a la contraria en
  // vez de perderse en el documento.
  useEffect(() => {
    const target = focusAfterRef.current
    focusAfterRef.current = null
    if (target === 'previous') previousRef.current?.focus()
    if (target === 'next') nextRef.current?.focus()
  }, [hasPrevious, hasNext])

  // Un vídeo que ya no se ve no sigue sonando: al cambiar de diapositiva se
  // pausan los de las demás.
  useEffect(() => {
    const slides = trackRef.current?.children
    if (!slides) return
    Array.from(slides).forEach((slide, index) => {
      if (index === active) return
      slide.querySelectorAll('video').forEach((video) => video.pause())
    })
  }, [active, trackRef])

  return (
    <div className={styles.carousel} style={{ width }}>
      <div className={styles.viewport}>
        <div ref={trackRef} className={styles.track} style={{ height }}>
          {carousel.map((item, index) => (
            <div
              key={item.mediaId}
              className={styles.slide}
              style={{ '--ratio': cssAspectRatio(ratio) } as CSSProperties}
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
                <CarouselVideo item={item} isFirstSlide={index === 0} />
              )}
            </div>
          ))}
        </div>

        {hasPrevious && (
          <button
            ref={previousRef}
            type="button"
            className={styles.arrow}
            data-direction="previous"
            aria-label="Previous slide"
            onClick={onPrevious}
          >
            <ArrowIcon direction="previous" />
          </button>
        )}
        {hasNext && (
          <button
            ref={nextRef}
            type="button"
            className={styles.arrow}
            data-direction="next"
            aria-label="Next slide"
            onClick={onNext}
          >
            <ArrowIcon direction="next" />
          </button>
        )}
      </div>

      {carousel.length > 1 && (
        <div className={styles.dots} role="group" aria-label="Slides">
          {visibleDots(carousel.length, active).map(({ index, size }) => (
            <button
              key={carousel[index].mediaId}
              type="button"
              className={styles.dot}
              data-size={size === 'full' ? undefined : size}
              aria-label={`Go to slide ${index + 1} of ${carousel.length}`}
              aria-current={index === active ? 'true' : undefined}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
