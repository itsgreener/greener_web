'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Prefetch del siguiente lote al entrar en el último tramo del scroll
 * (arquitectura §10.3), aproximado con un sentinel al final del contenido.
 *
 * Devuelve un ref de callback que se pasa al `<div>` sentinel: así el
 * observer se conecta cuando el elemento existe (también si aparece más
 * tarde) y no depende de ids globales en el DOM.
 */
export function useSentinel(onVisible: () => void) {
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onVisible()
      },
      { rootMargin: '600px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel, onVisible])

  return useCallback((el: HTMLElement | null) => setSentinel(el), [])
}
