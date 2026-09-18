import nodemailer from 'nodemailer'
import { env } from '@/lib/env'
import type { ContactFormInput } from '../domain/contactSchema'

/**
 * Un transporter por proceso, no uno por envío — nodemailer reutiliza la
 * conexión/pool de SMTP internamente; crear uno nuevo en cada request
 * sería tirar esa reutilización.
 */
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.CONTACT_SMTP_HOST,
      port: env.CONTACT_SMTP_PORT,
      secure: env.CONTACT_SMTP_SECURE,
      auth: {
        user: env.CONTACT_SMTP_USER,
        pass: env.CONTACT_SMTP_PASSWORD,
      },
    })
  }
  return transporter
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Envía el mensaje del formulario de contacto a la dirección de Greener
 * configurada (CONTACT_EMAIL_TO) — sin Mailchimp, eso es un flujo
 * aparte (newsletter, doble opt-in) que queda fuera a propósito por
 * ahora. `replyTo` al email que dejó el visitante: responder al correo
 * recibido contesta directamente a la persona, no a la propia bandeja
 * de envío.
 */
export async function sendContactEmail(input: ContactFormInput): Promise<void> {
  const text = [
    `Nombre: ${input.name}`,
    `Teléfono: ${input.phone}`,
    `Email: ${input.email}`,
    '',
    input.message,
  ].join('\n')

  const html = `
    <p><strong>Nombre:</strong> ${escapeHtml(input.name)}</p>
    <p><strong>Teléfono:</strong> ${escapeHtml(input.phone)}</p>
    <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
    <p><strong>Mensaje:</strong></p>
    <p>${escapeHtml(input.message).replaceAll('\n', '<br>')}</p>
  `

  await getTransporter().sendMail({
    from: env.CONTACT_EMAIL_FROM,
    to: env.CONTACT_EMAIL_TO,
    replyTo: input.email,
    subject: `Nuevo mensaje de contacto — ${input.name}`,
    text,
    html,
  })
}
