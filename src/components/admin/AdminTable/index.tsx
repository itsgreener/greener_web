import Link from 'next/link'

import { cx } from '@/lib/cx'

import styles from './AdminTable.module.css'

/**
 * La tabla del ABM: envoltorio con scroll horizontal y tabla con su cabecera,
 * sus filas y su hover. Los `<thead>`, `<tr>`, `<th>` y `<td>` se escriben a
 * mano dentro; solo las celdas con aspecto propio tienen componente.
 */
export function AdminTable({
  flush = false,
  children,
}: {
  /** Sin borde ni radio: para tablas que llenan una tarjeta sin relleno. */
  flush?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={cx(styles.wrapper, flush && styles.flush)}>
      <table className={styles.table}>{children}</table>
    </div>
  )
}

/** Celda de fecha (una sola línea) o de acción (pegada a la derecha). */
export function AdminTd({
  variant,
  className,
  ...props
}: React.ComponentProps<'td'> & { variant?: 'nowrap' | 'end' }) {
  return <td className={cx(variant && styles[variant], className)} {...props} />
}

/** Varios botones en una celda, en fila y sin pegarse. */
export function AdminCellActions({ children }: { children: React.ReactNode }) {
  return <div className={styles.actions}>{children}</div>
}

/** Enlace en negrita con el nombre de la fila. */
export function AdminTableTitle({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} className={styles.title}>
      {children}
    </Link>
  )
}

/** Línea pequeña en monoespaciada bajo el título (slug, email, id). Con `href`, es un enlace. */
export function AdminSubtext({
  href,
  children,
}: {
  href?: string
  children: React.ReactNode
}) {
  return href ? (
    <Link href={href} className={styles.subtext}>
      {children}
    </Link>
  ) : (
    <span className={styles.subtext}>{children}</span>
  )
}

export function AdminRowAction({
  href,
  label,
  children,
}: {
  href: string
  /** Nombre accesible cuando el texto visible («Editar») no basta. */
  label?: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} className={styles.rowAction} aria-label={label}>
      {children}
    </Link>
  )
}
