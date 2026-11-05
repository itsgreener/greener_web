import { AdminButton } from '@/components/admin/AdminButton'
import { AdminMessage } from '@/components/admin/AdminMessage'
import { cx } from '@/lib/cx'

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

/**
 * Pie de un formulario de edición: el error general, el aviso de éxito (si el
 * formulario lo muestra) y el botón de guardar, con «Guardando…» mientras
 * envía. Cada formulario conserva sus campos; aquí solo vive lo que se repetía
 * al final de todos.
 */
export function AdminFormFooter({
  state,
  pending,
  label,
  successMessage,
}: {
  /** Estado de la Server Action (`useActionState`). */
  state: { formError?: string; success?: boolean }
  pending: boolean
  /** Texto del botón en reposo («Guardar datos generales»). */
  label: string
  /** Aviso tras guardar; sin él, el éxito no se anuncia. */
  successMessage?: string
}) {
  return (
    <>
      {state.formError && (
        <AdminMessage kind="error">{state.formError}</AdminMessage>
      )}

      {state.success && successMessage && (
        <AdminMessage kind="success">{successMessage}</AdminMessage>
      )}

      <AdminFormActions>
        <AdminButton type="submit" variant="primary" disabled={pending}>
          {pending ? 'Guardando…' : label}
        </AdminButton>
      </AdminFormActions>
    </>
  )
}
