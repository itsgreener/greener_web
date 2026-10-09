import type { ReactNode } from 'react'
import styles from './StatusPage.module.css'

type StatusPageProps = {
  title: string
  message: string
  children?: ReactNode
}

/**
 * Cuerpo común de las páginas de 404 y de error. A propósito NO renderiza
 * <main>: dentro de (public) ya lo aporta el Shell, y en las páginas sin
 * Shell (not-found y global-error de la raíz) lo pone quien la usa.
 */
export function StatusPage({ title, message, children }: StatusPageProps) {
  return (
    <section className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.status}>{message}</p>
      {children ? <div className={styles.actions}>{children}</div> : null}
    </section>
  )
}
