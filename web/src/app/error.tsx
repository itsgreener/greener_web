'use client'

import { ErrorPage } from '@/components/status/ErrorPage'

// Errores fuera de (public) — sobre todo el ABM. Los de las páginas públicas
// los recoge (public)/error.tsx, con el Shell alrededor.
export default function RootError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main>
      <ErrorPage {...props} />
    </main>
  )
}
