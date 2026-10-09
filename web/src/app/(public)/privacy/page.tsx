import type { Metadata } from 'next'
import styles from './page.module.css'

/**
 * Placeholder de la política de privacidad/cookies (arquitectura §17.3,
 * §5.6 de este documento: "páginas legales", bloque sin empezar).
 *
 * Greener aporta el texto legal real (aviso legal, privacidad, cookies,
 * condiciones — arquitectura §17.3); este componente solo reserva la
 * ruta y el hueco visual mientras tanto. No sustituye a la decisión
 * pendiente de cómo se gestionará el contenido real (página bloqueada
 * vs. configuración versionada, arquitectura §14.3) — cuando se cierre
 * esa decisión, el texto de aquí se sustituye, no la ruta.
 */
export const metadata: Metadata = {
  title: 'Privacy & Cookies',
}

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Privacy &amp; Cookies</h1>
      <p className={styles.placeholder}>
        This page is a placeholder. The final privacy and cookie policy text is
        still pending from Greener.
      </p>
    </div>
  )
}
