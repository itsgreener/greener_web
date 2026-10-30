import { BrokenHeadline } from '@/components/text/BrokenHeadline'
import { buildPageMetadata } from '@/lib/pageMetadata'
import { ContactForm } from './ContactForm'
import styles from './page.module.css'

const CONTACT_HEADLINE = ['We', 'should have', 'a brand', 'together']

/**
 * Formulario de contacto real (brief §5.6, arquitectura §14.1):
 * nombre, teléfono, email y mensaje, con honeypot, límite por IP y un aviso
 * informativo de privacidad (la casilla no es un consentimiento desde el 19
 * oct 2026, ver `ContactForm`) — envío por SMTP (nodemailer) a una
 * dirección de Greener. La newsletter ya no se pide aquí: el alta se hace
 * solo desde su pin en el feed.
 *
 * Ruta e interfaz en inglés (arquitectura §2.4: "interfaz global en
 * inglés").
 */
export const metadata = buildPageMetadata({
  title: 'Contact',
  description:
    'Get in touch with Greener: a new website, a new brand, a product launch or a campaign.',
})

export default function ContactPage() {
  return (
    <div className={styles.page}>
      <BrokenHeadline
        as="h1"
        lines={CONTACT_HEADLINE}
        className={`${styles.title} text-display`}
      />
      <p className="text-body">
        {`
  Whether you're thinking about a new website, need a new brand, are about
  to launch a product, have a campaign in mind or just want to create
  something new, it usually starts with a message. Tell us who you are and
  what you're after. We'll write back, and the conversation starts there.`}
      </p>
      <ContactForm />
    </div>
  )
}
