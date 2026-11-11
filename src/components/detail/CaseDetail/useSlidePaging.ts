'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { readReducedMotion } from '@/lib/useMotionPreferences'

/**
 * Paginación del carrusel de un caso: de una diapositiva en una, también con
 * un gesto de scroll fuerte.
 *
 * Dos mecanismos, porque ninguno cubre todos los dispositivos:
 *
 * - CSS (`scroll-snap-stop: always` en cada diapositiva): el táctil y el
 *   trackpad con inercia se detienen en la siguiente aunque el gesto tuviera
 *   fuerza para recorrer varias.
 * - JS (rueda horizontal): con la rueda, Chrome suma el desplazamiento de
 *   cada giro y salta varias diapositivas de golpe; aquí un gesto horizontal
 *   mueve UNA diapositiva y se ignora el resto del mismo gesto (los eventos
 *   de inercia del trackpad llegan encadenados, separados por pocos ms).
 *   El scroll vertical de la rueda no se toca: la página sigue bajando.
 *
 * `active` (la diapositiva visible) se deduce siempre de `scrollLeft`, de
 * modo que el scroll nativo, la rueda y los puntos dicen lo mismo.
 */

/** Por debajo de este desplazamiento el evento es ruido del trackpad. */
const WHEEL_MIN_DELTA = 4
/** Tras mover una diapositiva, no se mueve otra hasta pasado este tiempo. */
const WHEEL_LOCK_MS = 450
/** Dos eventos de rueda separados por menos que esto son el mismo gesto. */
const WHEEL_SAME_GESTURE_MS = 90

export function useSlidePaging(count: number) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const currentIndex = useCallback((): number => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return 0
    return Math.round(track.scrollLeft / track.clientWidth)
  }, [])

  const goTo = useCallback(
    (index: number, options: { instant?: boolean } = {}) => {
      const track = trackRef.current
      if (!track || count === 0) return
      const clamped = Math.min(Math.max(index, 0), count - 1)
      const left = clamped * track.clientWidth
      // jsdom no implementa `scrollTo` en elementos.
      if (typeof track.scrollTo === 'function') {
        track.scrollTo({
          left,
          // `instant`: volver al principio de un carrusel que da la vuelta
          // (carrusel de pines del feed, §2.150) sin recorrerlo entero.
          behavior: options.instant || readReducedMotion() ? 'auto' : 'smooth',
        })
      } else {
        track.scrollLeft = left
      }
      setActive(clamped)
    },
    [count],
  )

  // Diapositiva visible: se recalcula al hacer scroll (rueda, táctil, puntos).
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let frame = 0

    const sync = () => {
      frame = 0
      setActive(currentIndex())
    }
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(sync)
    }

    track.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      track.removeEventListener('scroll', onScroll)
      if (frame !== 0) cancelAnimationFrame(frame)
    }
  }, [currentIndex])

  // Rueda horizontal: una diapositiva por gesto. El listener tiene que ser
  // no pasivo para poder cancelar el desplazamiento nativo (los `onWheel` de
  // React son pasivos).
  useEffect(() => {
    const track = trackRef.current
    if (!track || count < 2) return
    let lastEventAt = -Infinity
    let lastMoveAt = -Infinity

    const onWheel = (event: WheelEvent) => {
      // Vertical: es el scroll de la página, que sigue su curso.
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
      event.preventDefault()
      if (Math.abs(event.deltaX) < WHEEL_MIN_DELTA) return

      const now = event.timeStamp
      const sameGesture = now - lastEventAt < WHEEL_SAME_GESTURE_MS
      lastEventAt = now
      if (sameGesture || now - lastMoveAt < WHEEL_LOCK_MS) return

      lastMoveAt = now
      goTo(currentIndex() + (event.deltaX > 0 ? 1 : -1))
    }

    track.addEventListener('wheel', onWheel, { passive: false })
    return () => track.removeEventListener('wheel', onWheel)
  }, [count, currentIndex, goTo])

  return { trackRef, active, goTo }
}
