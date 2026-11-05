import Link from 'next/link'

import styles from './AdminPage.module.css'

type PageProps = {
  /** `wide` para listados y editor; `narrow` para formularios de alta. */
  width?: 'wide' | 'narrow'
  children: React.ReactNode
}

/**
 * Envoltorio de toda página del panel: el padding, el ancho máximo y el
 * centrado viven aquí, no en cada página. El fondo gris es el del shell.
 */
export function AdminPage({ width = 'wide', children }: PageProps) {
  return (
    <main className={styles.page}>
      <div className={width === 'narrow' ? styles.narrow : styles.wide}>
        {children}
      </div>
    </main>
  )
}

type HeaderProps = {
  eyebrow?: React.ReactNode
  title: string
  description?: React.ReactNode
  /** Fila bajo el título (insignias, ids…). */
  meta?: React.ReactNode
  /** Columna de la derecha: botón principal o panel de acciones. */
  actions?: React.ReactNode
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
}: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.heading}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}

        <h1 className={styles.title}>{title}</h1>

        {description && <p className={styles.description}>{description}</p>}

        {meta && <div className={styles.meta}>{meta}</div>}
      </div>

      {actions}
    </header>
  )
}

export function AdminBackLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} className={styles.back}>
      {children}
    </Link>
  )
}
