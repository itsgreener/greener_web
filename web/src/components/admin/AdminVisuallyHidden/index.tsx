import styles from './AdminVisuallyHidden.module.css'

/** Texto solo para lectores de pantalla (etiquetas de búsqueda, columnas de acciones). */
export function AdminVisuallyHidden({
  children,
}: {
  children: React.ReactNode
}) {
  return <span className={styles.hidden}>{children}</span>
}
