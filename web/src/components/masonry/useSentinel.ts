'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Colchón del prefetch, en alturas de viewport (con un suelo en píxeles para
 * ventanas bajas). 600 px fijos eran menos que una pantalla: con un scroll
 * rápido se llegaba al final antes de que el lote hubiera vuelto.
 */
const PREFETCH_MARGIN_VIEWPORTS = 2
const PREFETCH_MARGIN_MIN_PX = 1200

/**
 * Prefetch del siguiente lote al entrar en el último tramo del scroll
 * (arquitectura §10.3), aproximado con un sentinel al final del contenido.
 *
 * Devuelve un ref de callback que se pasa al `<div>` sentinel: así el
 * observer se conecta cuando el elemento existe (también si aparece más
 * tarde) y no depende de ids globales en el DOM.
 *
 * Un `IntersectionObserver` solo avisa cuando CAMBIA la intersección. Si el
 * sentinel sigue dentro del colchón tras un intento que no trajo pines (por
 * ejemplo un lote vacío por límite de peticiones), no vuelve a avisar solo.
 * `recheckKey` sirve para eso: al cambiar, se recrea el observer, que avisa
 * al instante si el sentinel sigue a la vista.
 */
export function useSentinel(onVisible: () => void, recheckKey = 0) {
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!sentinel) return
    const marginPx = Math.max(
      PREFETCH_MARGIN_MIN_PX,
      window.innerHeight * PREFETCH_MARGIN_VIEWPORTS,
    )
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onVisible()
      },
      { rootMargin: `${marginPx}px` },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel, onVisible, recheckKey])

  return useCallback((el: HTMLElement | null) => setSentinel(el), [])
}
