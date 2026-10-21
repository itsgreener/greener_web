import { cx } from '@/components/admin/cx'

import styles from './AdminForm.module.css'

/** Formulario apilado con el espaciado del ABM. */
export function AdminForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {
  return <form className={cx(styles.form, className)} {...props} />
}

/** Dos columnas (una en móvil). */
export function AdminFormGrid({ children }: { children: React.ReactNode }) {
  return <div className={styles.grid}>{children}</div>
}

/** Fila de botones al pie del formulario, alineada a la derecha. */
export function AdminFormActions({ children }: { children: React.ReactNode }) {
  return <div className={styles.actions}>{children}</div>
}

/** Lo mismo que `AdminForm` para bloques que no envían un `<form>` (subidas por JS). */
export function AdminFormBody({ children }: { children: React.ReactNode }) {
  return <div className={styles.form}>{children}</div>
}
