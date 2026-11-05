'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { StatusPage } from '@/components/status/StatusPage'
import { ERROR_COPY, type ErrorBoundaryProps } from './copy'

/**
 * Límite de error básico para las rutas (error.tsx). `reset` vuelve a
 * intentar renderizar el segmento que falló.
 */
export function ErrorPage({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Sin sistema de error tracking todavía (PROGRESO §4.8): al menos
    // queda en la consola del navegador para poder diagnosticarlo.
    console.error(error)
  }, [error])

  return (
    <StatusPage title={ERROR_COPY.title} message={ERROR_COPY.message}>
      <button type="button" onClick={reset}>
        {ERROR_COPY.retry}
      </button>
      <Link href="/">{ERROR_COPY.home}</Link>
    </StatusPage>
  )
}
