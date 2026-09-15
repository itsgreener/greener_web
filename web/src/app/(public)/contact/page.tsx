import type { Metadata } from 'next'
import styles from './page.module.css'

/**
 * Placeholder de Contacto (brief §5.6, arquitectura §14.1) — de momento
 * solo fija la ruta a la que ya apunta el Shell; el formulario real
 * (Server Action, honeypot, límite por IP, registro en Supabase) es
 * trabajo aparte, todavía sin empezar (PROGRESO.md §3.6/§5.5).
 *
 * Ruta e interfaz en inglés (arquitectura §2.4: "interfaz global en
 * inglés") — antes vivía en /contacto, renombrada el 15 sep junto con
 * el resto de labels del Shell para no tener dos vocabularios en la
 * misma página.
 */
export const metadata: Metadata = {
  title: 'Contact',
}

export default function ContactPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Contact</h1>
      <p className={styles.body}>This page is under construction.</p>
    </div>
  )
}
