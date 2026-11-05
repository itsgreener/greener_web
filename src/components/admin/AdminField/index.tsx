import styles from './AdminField.module.css'

type FieldProps = {
  label: React.ReactNode
  /** `id` del control que contiene `children`. */
  htmlFor: string
  /** A la derecha de la etiqueta: normalmente un `CharCounter`. */
  aside?: React.ReactNode
  help?: React.ReactNode
  /** Primer mensaje de error del campo; sin valor, no se pinta nada. */
  error?: React.ReactNode
  children: React.ReactNode
}

/** Etiqueta + control + ayuda + error: el patrón de todos los formularios. */
export function AdminField({
  label,
  htmlFor,
  aside,
  help,
  error,
  children,
}: FieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={htmlFor} className={styles.label}>
          {label}
        </label>

        {aside && <span className={styles.aside}>{aside}</span>}
      </div>

      {children}

      {help && <p className={styles.help}>{help}</p>}

      <AdminFieldError>{error}</AdminFieldError>
    </div>
  )
}

/** Línea de ayuda suelta, para un grupo de controles y no para uno solo. */
export function AdminHint({ children }: { children: React.ReactNode }) {
  return <p className={styles.hint}>{children}</p>
}

/** Error de un campo suelto (sin `AdminField`). Sin hijos, no se pinta. */
export function AdminFieldError({ children }: { children?: React.ReactNode }) {
  return children ? <p className={styles.error}>{children}</p> : null
}

/** Dato que se enseña pero no se edita (tipo, estado…). */
export function AdminReadonlyField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className={styles.readonly}>
      <span className={styles.readonlyLabel}>{label}</span>

      {children}
    </div>
  )
}

export function AdminFieldset({
  legend,
  disabled,
  children,
}: {
  legend: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <fieldset className={styles.fieldset} disabled={disabled}>
      <legend className={styles.legend}>{legend}</legend>

      {children}
    </fieldset>
  )
}
