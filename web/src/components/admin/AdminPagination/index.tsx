import Link from 'next/link'

import styles from './AdminPagination.module.css'

type Props = {
  page: number
  pageCount: number
  /** Enlace a la página anterior; `null` si ya estamos en la primera. */
  previousHref: string | null
  /** Enlace a la página siguiente; `null` si ya estamos en la última. */
  nextHref: string | null
}

/** Paginación de los listados. Sin más de una página, no se pinta. */
export function AdminPagination({
  page,
  pageCount,
  previousHref,
  nextHref,
}: Props) {
  if (pageCount <= 1) return null

  return (
    <nav className={styles.pagination} aria-label="Paginación">
      {previousHref ? (
        <Link href={previousHref} rel="prev">
          ← Anterior
        </Link>
      ) : (
        <span className={styles.disabled} aria-hidden="true">
          ← Anterior
        </span>
      )}

      <span>
        Página {page} de {pageCount}
      </span>

      {nextHref ? (
        <Link href={nextHref} rel="next">
          Siguiente →
        </Link>
      ) : (
        <span className={styles.disabled} aria-hidden="true">
          Siguiente →
        </span>
      )}
    </nav>
  )
}
