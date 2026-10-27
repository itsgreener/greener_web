import styles from './PublicField.module.css'

type Props = {
  /** `name` del control; también su `id` salvo que se indique otro. */
  name: string
  label: string
  id?: string
  type?: 'text' | 'email' | 'tel'

  /** Con `rows` el control es un `<textarea>`. */
  rows?: number
  required?: boolean

  /** Primer error de validación del campo, si lo hay. */
  error?: string
}

/**
 * Campo de los formularios públicos: label, control y error de validación.
 * El error se asocia al control con `aria-describedby` y se anuncia con
 * `role="alert"`; así lo oye quien usa un lector de pantalla sin tener que
 * volver a recorrer el formulario.
 */
export function PublicField({
  name,
  label,
  id = name,
  type = 'text',
  rows,
  required,
  error,
}: Props) {
  const errorId = `${id}-error`
  const controlProps = {
    id,
    name,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {rows === undefined ? (
        <input type={type} {...controlProps} />
      ) : (
        <textarea rows={rows} {...controlProps} />
      )}
      {error && (
        <p id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
