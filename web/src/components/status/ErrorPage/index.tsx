'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { StatusPage } from '@/components/status/StatusPage'

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Límite de error básico para las rutas (error.tsx). `reset` vuelve a
 * intentar renderizar el segmento que falló.
 */
export function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Sin sistema de error tracking todavía (PROGRESO §4.8): al menos
    // queda en la consola del navegador para poder diagnosticarlo.
    console.error(error)
  }, [error])

  return (
    <StatusPage
      title="Something went wrong"
      message="An unexpected error occurred. You can try again or head back to the home page."
    >
      <button type="button" onClick={reset}>
        Try again
      </button>
      <Link href="/">Back to home</Link>
    </StatusPage>
  )
}
