'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Ancho del contenedor — determina las columnas (§10.1) sin depender del
 * ancho de window completo (el shell reserva la barra lateral). Lo usan el
 * feed y el panel de recomendaciones de los detalles.
 */
export function useContainerWidth() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setContainerWidth(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { containerRef, containerWidth }
}
