import styles from './page.module.css'

/**
 * Placeholder de la Home. El feed real (motor de tandas, masonry, scroll
 * infinito) se conecta aquí en la Fase 3 del plan de ejecución
 * (documento de arquitectura, Anexo E.4).
 */
export default function Home() {
  return (
    <div className={styles.page}>
      <h1>Greener</h1>
      <p>Home — pendiente de conectar el motor de feed.</p>
    </div>
  )
}
