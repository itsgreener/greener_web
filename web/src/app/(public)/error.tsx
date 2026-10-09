'use client'

import { ErrorPage } from '@/components/status/ErrorPage'

// Error inesperado en una página pública: se pinta dentro del Shell.
export default function PublicError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorPage {...props} />
}
