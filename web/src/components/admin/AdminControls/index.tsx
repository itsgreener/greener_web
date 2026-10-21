import { cx } from '@/components/admin/cx'

import styles from './AdminControls.module.css'

type Compact = {
  /** Versión baja, para filtros y celdas de tabla. */
  compact?: boolean
}

/*
 * Los tres controles de texto del ABM. Llevan el estilo en su propia clase
 * (no en un selector `.card input`), así que valen en cualquier sitio:
 * dentro de una tarjeta, de una tabla o suelto en una barra de filtros.
 */

export function AdminInput({
  compact = false,
  className,
  ...props
}: Compact & React.ComponentProps<'input'>) {
  return (
    <input
      className={cx(styles.control, compact && styles.compact, className)}
      {...props}
    />
  )
}

export function AdminSelect({
  compact = false,
  className,
  ...props
}: Compact & React.ComponentProps<'select'>) {
  return (
    <select
      className={cx(styles.control, compact && styles.compact, className)}
      {...props}
    />
  )
}

export function AdminTextarea({
  className,
  ...props
}: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cx(styles.control, styles.textarea, className)}
      {...props}
    />
  )
}
