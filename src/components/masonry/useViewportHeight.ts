'use client'

import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

function getSnapshot() {
  return window.innerHeight
}

/** En servidor (y en la primera pasada de hidratación) aún no hay alto. */
function getServerSnapshot() {
  return 0
}

/**
 * Alto de la ventana, actualizado al redimensionar (lo que haría `dvh` en
 * CSS). Lo usa el panel de recomendaciones de los detalles para el 66,7vh
 * del bloque de contenido. Como el ancho del contenedor (`useContainerWidth`),
 * vale 0 hasta que el cliente lo mide.
 */
export function useViewportHeight(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
