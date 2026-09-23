'use client'

import { useEffect, type ReactNode } from 'react'

import { initAnalytics } from './analytics'

type Props = {
  domain?: string
  children: ReactNode
}

/**
 * Inicializa Plausible únicamente para la rama pública.
 *
 * El dominio llega desde el Server Component que envuelve esta rama,
 * de modo que no necesitamos importar configuración server-side en el
 * navegador.
 */
export function AnalyticsProvider({ domain, children }: Props) {
  useEffect(() => {
    initAnalytics(domain)
  }, [domain])

  return children
}
