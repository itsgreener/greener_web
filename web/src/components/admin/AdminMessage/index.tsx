import { cx } from '@/lib/cx'

import styles from './AdminMessage.module.css'

type Kind = 'notice' | 'warning' | 'error' | 'success'

type Props = {
  /** `notice` informa; `warning` avisa sin bloquear; `error` y `success` responden a una acción. */
  kind?: Kind
  role?: 'status' | 'alert'
  /** `div` cuando el aviso lleva dentro botones, formularios u otros bloques. */
  as?: 'p' | 'div'
  /** Con margen propio, para un aviso suelto en una tarjeta sin relleno. */
  inset?: boolean
  className?: string
  children: React.ReactNode
}

const KIND_CLASS: Record<Kind, string | undefined> = {
  notice: undefined,
  warning: styles.warning,
  error: styles.error,
  success: styles.success,
}

/**
 * Mensaje en bloque: el que sustituye al `<p>` suelto de los errores,
 * confirmaciones y avisos. Para el error de un campo, `AdminField`.
 */
export function AdminMessage({
  kind = 'notice',
  role,
  as: Tag = 'p',
  inset = false,
  className,
  children,
}: Props) {
  return (
    <Tag
      className={cx(
        styles.message,
        KIND_CLASS[kind],
        inset && styles.inset,
        className,
      )}
      role={role}
    >
      {children}
    </Tag>
  )
}
