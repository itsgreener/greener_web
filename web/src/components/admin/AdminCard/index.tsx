import { cx } from '@/components/admin/cx'

import styles from './AdminCard.module.css'

type CardProps = {
  as?: 'section' | 'article' | 'aside' | 'div'
  /** `danger` tiñe la tarjeta de rojo (zona peligrosa). */
  tone?: 'default' | 'danger'
  /** Sin relleno, para tarjetas cuyo contenido (filtros, tabla) llega a los bordes. */
  padded?: boolean
  className?: string
  children: React.ReactNode
}

/** La tarjeta del ABM: la única. Panel, listados, editor y fichas la comparten. */
export function AdminCard({
  as: Tag = 'section',
  tone = 'default',
  padded = true,
  className,
  children,
}: CardProps) {
  return (
    <Tag
      className={cx(
        styles.card,
        padded && styles.padded,
        tone === 'danger' && styles.danger,
        className,
      )}
    >
      {children}
    </Tag>
  )
}

type HeaderProps = {
  kicker?: string
  title: string
  description?: React.ReactNode
  /** Enlace o botón a la derecha del título. */
  actions?: React.ReactNode
  /** Sin margen inferior, cuando debajo hay una lista que ya trae su espaciado. */
  tight?: boolean
}

export function AdminCardHeader({
  kicker,
  title,
  description,
  actions,
  tight = false,
}: HeaderProps) {
  return (
    <div className={cx(styles.header, tight && styles.tight)}>
      <div>
        {kicker && <p className={styles.kicker}>{kicker}</p>}

        <h2 className={styles.title}>{title}</h2>

        {description && <p className={styles.description}>{description}</p>}
      </div>

      {actions}
    </div>
  )
}

/** Bloque dentro de una tarjeta; varios seguidos se separan con una línea. */
export function AdminCardSection({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <div className={styles.section}>
      {title && <h3 className={styles.sectionTitle}>{title}</h3>}

      {children}
    </div>
  )
}

/** Párrafo explicativo dentro de una tarjeta o sección. */
export function AdminCardText({ children }: { children: React.ReactNode }) {
  return <p className={styles.sectionText}>{children}</p>
}

/** Título menor dentro de una sección de tarjeta (un bloque de subida, una lista). */
export function AdminSubheading({ children }: { children: React.ReactNode }) {
  return <h4 className={styles.subheading}>{children}</h4>
}
