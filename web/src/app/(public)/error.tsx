'use client'

import { ErrorPage } from '@/components/status/ErrorPage'
import type { ErrorBoundaryProps } from '@/components/status/ErrorPage/copy'

// Error inesperado en una página pública: se pinta dentro del Shell.
export default function PublicError(props: ErrorBoundaryProps) {
  return <ErrorPage {...props} />
}
