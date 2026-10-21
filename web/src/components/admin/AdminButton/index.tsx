import Link from 'next/link'

import { cx } from '@/components/admin/cx'

import styles from './AdminButton.module.css'

export type AdminButtonVariant =
  'primary' | 'secondary' | 'danger' | 'danger-solid'

type Options = {
  variant?: AdminButtonVariant
  /** Versión baja, para botones dentro de una fila de tabla. */
  compact?: boolean
  className?: string
}

const VARIANT_CLASS: Record<AdminButtonVariant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  danger: styles.danger,
  'danger-solid': styles.dangerSolid,
}

/**
 * Clase de un botón, para el caso raro de un `<a>` externo con aspecto de
 * botón. Todo lo demás usa `AdminButton` o `AdminButtonLink`.
 */
export function adminButtonClass({
  variant = 'secondary',
  compact = false,
  className,
}: Options = {}) {
  return cx(
    styles.button,
    VARIANT_CLASS[variant],
    compact && styles.compact,
    className,
  )
}

type ButtonProps = Options & React.ComponentProps<'button'>

/** No fija `type`: cada uso declara `submit` o `button`. */
export function AdminButton({
  variant,
  compact,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={adminButtonClass({ variant, compact, className })}
      {...props}
    />
  )
}

type LinkProps = Options & React.ComponentProps<typeof Link>

export function AdminButtonLink({
  variant,
  compact,
  className,
  ...props
}: LinkProps) {
  return (
    <Link
      className={adminButtonClass({ variant, compact, className })}
      {...props}
    />
  )
}
