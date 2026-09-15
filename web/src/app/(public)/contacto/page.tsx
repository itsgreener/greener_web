import type { Metadata } from 'next'
import styles from './page.module.css'

/**
 * Placeholder de Contacto (brief §5.6, arquitectura §14.1) — de momento
 * solo fija la ruta a la que ya apunta el Shell; el formulario real
 * (Server Action, honeypot, límite por IP, registro en Supabase) es
 * trabajo aparte, todavía sin empezar (PROGRESO.md §3.6/§5.5).
 */
export const metadata: Metadata = {
  title: 'Contacto',
}

export default function ContactoPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Contacto</h1>
      <p className={styles.body}>Esta página está en construcción.</p>
    </div>
  )
}
