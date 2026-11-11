'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

import {
  CAROUSEL_VISIBLE_RATIO,
  carouselStaggerMs,
} from '@/modules/feed/domain/carouselTiming'

/**
 * Avance automático del carrusel de pines del feed (§2.150).
 *
 * Pasa a la siguiente diapositiva tras `slideMs` y, en la última, vuelve a la
 * primera sin recorrer el carrusel entero (continuo, sin fin). Solo corre
 * cuando se puede ver y nadie lo está mirando de cerca:
 *
 * - la tarjeta se ve al menos a medias (IntersectionObserver) y la pestaña
 *   está visible;
 * - el puntero o el foco no están encima (`paused`): quien lee el pie o mira un
 *   plano no lo pierde (WCAG 2.2.2, pausar contenido que se mueve solo);
 * - el visitante no ha pedido menos movimiento ni va con datos limitados
 *   (`enabled`, que llega de `feedAutoplayAllowed`).
 *
 * Cada cambio de `active` reinicia la cuenta, así que un gesto del usuario
 * (deslizar) también la reinicia: no se le arrebata la diapositiva que acaba de
 * elegir. El primer avance se retrasa un desfase estable por tarjeta
 * (`staggerKey`) para que varias tarjetas visibles a la vez no cambien en el
 * mismo instante.
 */
export function useCarouselAutoplay({
  cardRef,
  count,
  active,
  goTo,
  slideMs,
  enabled,
  paused,
  staggerKey,
}: {
  cardRef: RefObject<HTMLElement | null>
  count: number
  active: number
  goTo: (index: number, options?: { instant?: boolean }) => void
  /** Cuánto se queda la diapositiva activa (`carouselSlideMs`). */
  slideMs: number
  enabled: boolean
  /** Puntero o foco encima de la tarjeta. */
  paused: boolean
  staggerKey: string
}) {
  const [inView, setInView] = useState(true)
  const [tabVisible, setTabVisible] = useState(true)
  // El desfase solo se aplica al primer avance de la tarjeta.
  const firstAdvance = useRef(true)

  useEffect(() => {
    const el = cardRef.current

    if (!el || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setInView(
            entry.isIntersecting &&
              entry.intersectionRatio >= CAROUSEL_VISIBLE_RATIO,
          )
        }
      },
      { threshold: [0, CAROUSEL_VISIBLE_RATIO, 1] },
    )

    observer.observe(el)

    return () => observer.disconnect()
  }, [cardRef])

  useEffect(() => {
    const sync = () => setTabVisible(document.visibilityState !== 'hidden')

    sync()
    document.addEventListener('visibilitychange', sync)

    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  const running = enabled && !paused && inView && tabVisible && count > 1

  useEffect(() => {
    if (!running) return

    const delay =
      slideMs + (firstAdvance.current ? carouselStaggerMs(staggerKey) : 0)

    const timer = setTimeout(() => {
      firstAdvance.current = false

      if (active + 1 < count) goTo(active + 1)
      else goTo(0, { instant: true })
    }, delay)

    return () => clearTimeout(timer)
  }, [running, active, count, goTo, slideMs, staggerKey])
}
