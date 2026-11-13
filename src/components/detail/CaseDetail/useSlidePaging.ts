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
 * modo que el scroll nativo, la rueda, los puntos y las flechas dicen lo
 * mismo. Mientras dura un desplazamiento pedido por código (`goTo`) se
 * espera a llegar al destino antes de volver a deducirlo: sin eso, el
 * indicador volvía a la diapositiva anterior durante la primera mitad del
 * movimiento y las flechas de los extremos parpadeaban.
 */

/** Por debajo de este desplazamiento el evento es ruido del trackpad. */
const WHEEL_MIN_DELTA = 4
/** Tras mover una diapositiva, no se mueve otra hasta pasado este tiempo. */
const WHEEL_LOCK_MS = 450
/** Dos eventos de rueda separados por menos que esto son el mismo gesto. */
const WHEEL_SAME_GESTURE_MS = 90
/** Margen en píxeles para dar por llegado un desplazamiento pedido. */
const ARRIVAL_TOLERANCE_PX = 2
/** Pasado este tiempo, un desplazamiento pedido se da por terminado. */
const PENDING_TIMEOUT_MS = 700

export function useSlidePaging(count: number) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  // Destino de un desplazamiento pedido por código que aún no ha llegado.
  const pendingRef = useRef<number | null>(null)
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPending = useCallback(() => {
    pendingRef.current = null
    if (pendingTimerRef.current !== null) {
      clearTimeout(pendingTimerRef.current)
      pendingTimerRef.current = null
    }
  }, [])

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
      clearPending()
      pendingRef.current = clamped
      // Red de seguridad: si el desplazamiento no llega nunca (se interrumpe
      // con el dedo, el navegador lo recorta…), se vuelve a deducir del scroll.
      pendingTimerRef.current = setTimeout(clearPending, PENDING_TIMEOUT_MS)
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
    [count, clearPending],
  )

  /**
   * Una diapositiva hacia delante (`1`) o hacia atrás (`-1`); devuelve la
   * diapositiva de destino. Parte del destino en curso si lo hay, así que dos
   * pulsaciones seguidas avanzan dos diapositivas aunque la primera aún se
   * esté desplazando.
   */
  const step = useCallback(
    (delta: 1 | -1): number => {
      const from = pendingRef.current ?? currentIndex()
      const target = Math.min(Math.max(from + delta, 0), Math.max(count - 1, 0))
      goTo(target)
      return target
    },
    [count, currentIndex, goTo],
  )

  // Diapositiva visible: se recalcula al hacer scroll (rueda, táctil, puntos).
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let frame = 0

    const sync = () => {
      frame = 0
      const pending = pendingRef.current
      if (pending !== null) {
        const arrived =
          Math.abs(track.scrollLeft - pending * track.clientWidth) <=
          ARRIVAL_TOLERANCE_PX
        if (!arrived) return
        clearPending()
      }
      setActive(currentIndex())
    }
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(sync)
    }

    track.addEventListener('scroll', onScroll, { passive: true })
    // Tocar o arrastrar el carrusel interrumpe el desplazamiento pedido: manda
    // el dedo, no el destino anterior.
    track.addEventListener('pointerdown', clearPending)
    return () => {
      track.removeEventListener('scroll', onScroll)
      track.removeEventListener('pointerdown', clearPending)
      if (frame !== 0) cancelAnimationFrame(frame)
    }
  }, [currentIndex, clearPending])

  useEffect(() => clearPending, [clearPending])

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

  return { trackRef, active, goTo, step }
}
