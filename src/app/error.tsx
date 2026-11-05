'use client'

import { ErrorPage } from '@/components/status/ErrorPage'
import type { ErrorBoundaryProps } from '@/components/status/ErrorPage/copy'

// Errores fuera de (public) — sobre todo el ABM. Los de las páginas públicas
// los recoge (public)/error.tsx, con el Shell alrededor.
export default function RootError(props: ErrorBoundaryProps) {
  return (
    <main>
      <ErrorPage {...props} />
    </main>
  )
}
