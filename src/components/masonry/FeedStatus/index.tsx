export type FeedStatusCopy = {
  loadError: string
  loading: string
  empty: string
}

type Props = {
  /** Algo falló al cargar. El texto es siempre `copy.loadError`. */
  error: boolean
  isLoading: boolean
  itemCount: number
  hasMore: boolean
  copy: FeedStatusCopy
  className?: string
}

/**
 * Mensaje de estado de una retícula de pins: error, primera carga o vacío.
 * Lo comparten el feed y el panel de recomendaciones, cada uno con sus
 * textos. Solo se pinta uno, en ese orden de prioridad; con contenido a la
 * vista no pinta nada.
 */
export function FeedStatus({
  error,
  isLoading,
  itemCount,
  hasMore,
  copy,
  className,
}: Props) {
  if (error) return <p className={className}>{copy.loadError}</p>
  if (itemCount > 0) return null
  if (isLoading) return <p className={className}>{copy.loading}</p>
  if (!hasMore) return <p className={className}>{copy.empty}</p>
  return null
}
