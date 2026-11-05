import styles from './layout.module.css'

/**
 * Layout común de las páginas de detalle (tool, insight, variety, caso y
 * episodio): la plantilla de cada tipo ya trae su propia maquetación, aquí
 * solo se fija que ocupe todo el ancho del área de contenido.
 */
export default function DetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className={styles.page}>{children}</div>
}
