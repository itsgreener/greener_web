'use client'

import { useEffect, useRef } from 'react'

import type { FeedScope } from '@/modules/feed/domain/feedScope'

/**
 * Scroll del feed: guarda la posición mientras se navega y la restaura al
 * volver de un detalle.
 *
 * - Guardar: la posición se anota continuamente (limitada a un frame con
 *   `requestAnimationFrame`) para poder restaurarla. `setScrollY` no debe
 *   re-renderizar (en `FeedProvider` escribe en un ref).
 * - Restaurar: si al montar ESTE hook ya había pines en el contexto (vuelta de
 *   un detalle, `hadItemsOnMount`), salta a la posición guardada en cuanto el
 *   layout tenga altura real (`ready`); antes de eso el scroll caería en una
 *   zona vacía. Se captura solo en el montaje, no en los renders siguientes.
 */
export function useFeedScroll(
  scope: FeedScope,
  {
    setScrollY,
    getScrollY,
    hadItemsOnMount,
    ready,
  }: {
    setScrollY: (scope: FeedScope, y: number) => void
    getScrollY: () => number
    hadItemsOnMount: boolean
    /** El layout ya tiene altura real (`totalHeight > 0`). */
    ready: boolean
  },
) {
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setScrollY(scope, window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [scope, setScrollY])

  const shouldRestoreRef = useRef(hadItemsOnMount)
  useEffect(() => {
    if (!shouldRestoreRef.current || !ready) return
    window.scrollTo(0, getScrollY())
    shouldRestoreRef.current = false
  }, [ready, getScrollY])
}
