import styles from './AdminBrand.module.css'

/**
 * Nombre y rótulo del ABM. Va dentro del contenedor que decide la
 * maquetación (el enlace de la barra lateral, la cabecera del login): aquí
 * solo están los dos textos.
 */
export function AdminBrand() {
  return (
    <>
      <span className={styles.name}>Greener</span>

      <span className={styles.label}>Admin</span>
    </>
  )
}
