/**
 * Texto de las páginas de error. Lo comparten `ErrorPage` (con router) y
 * `app/global-error.tsx`, que no puede usar `ErrorPage` entera porque falla
 * el layout raíz y el router puede no estar disponible.
 */
export const ERROR_COPY = {
  title: 'Something went wrong',
  message:
    'An unexpected error occurred. You can try again or head back to the home page.',
  retry: 'Try again',
  home: 'Back to home',
} as const

/** Propiedades que Next pasa a un `error.tsx` o `global-error.tsx`. */
export type ErrorBoundaryProps = {
  error: Error & { digest?: string }
  reset: () => void
}
