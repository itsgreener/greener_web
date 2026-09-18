import type { Metadata } from 'next'
import { ContactForm } from './ContactForm'
import styles from './page.module.css'

/**
 * Formulario de contacto real (brief §5.6, arquitectura §14.1):
 * nombre, teléfono, email y mensaje, con honeypot, límite por IP y
 * consentimiento de privacidad — envío por SMTP (nodemailer) a una
 * dirección de Greener, sin Mailchimp (eso es un flujo aparte, queda
 * fuera a propósito por ahora).
 *
 * Ruta e interfaz en inglés (arquitectura §2.4: "interfaz global en
 * inglés") — antes vivía en /contacto, renombrada el 15 sep.
 */
export const metadata: Metadata = {
  title: 'Contact',
}

export default function ContactPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Contact</h1>
      <ContactForm />
    </div>
  )
}
