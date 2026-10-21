import { cx } from '@/components/admin/cx'

import styles from './AdminEmptyState.module.css'

type Props = {
  title: string
  description: string
  /** Botón o enlace para salir del estado vacío. */
  action?: React.ReactNode
  /** Ocupa una tarjeta entera (listados) en vez de un hueco dentro de ella. */
  large?: boolean
}

export function AdminEmptyState({
  title,
  description,
  action,
  large = false,
}: Props) {
  return (
    <div className={cx(styles.empty, large && styles.large)}>
      <strong className={styles.title}>{title}</strong>

      <p className={styles.description}>{description}</p>

      {action}
    </div>
  )
}
