import Link from 'next/link'

import { AdminInput } from '@/components/admin/AdminControls'
import { AdminVisuallyHidden } from '@/components/admin/AdminVisuallyHidden'

import styles from './AdminFilterBar.module.css'

/**
 * Barra de filtros de un listado: un `<form method="get">`, así que los
 * filtros viven en la URL. Dentro van `AdminFilterSearch`, los `AdminSelect
 * compact` que haga falta, el botón de enviar y `AdminFilterClear`. Se le pone
 * `key` con los valores actuales para que se repinte al cambiar la URL.
 */
export function AdminFilterBar({
  children,
  ...props
}: Omit<React.ComponentProps<'form'>, 'className' | 'method'>) {
  return (
    <form method="get" className={styles.bar} {...props}>
      {children}
    </form>
  )
}

export function AdminFilterSearch({
  id,
  label,
  defaultValue,
  placeholder,
}: {
  id: string
  /** Nombre accesible; la etiqueta no se ve. */
  label: string
  defaultValue: string
  placeholder: string
}) {
  return (
    <div className={styles.search}>
      <label htmlFor={id}>
        <AdminVisuallyHidden>{label}</AdminVisuallyHidden>
      </label>

      <AdminInput
        compact
        id={id}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </div>
  )
}

export function AdminFilterClear({ href }: { href: string }) {
  return (
    <Link href={href} className={styles.clear}>
      Limpiar
    </Link>
  )
}

/** Fila «N contenidos» bajo la barra de filtros. */
export function AdminResultBar({ children }: { children: React.ReactNode }) {
  return <div className={styles.results}>{children}</div>
}
