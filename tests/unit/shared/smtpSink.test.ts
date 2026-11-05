import nodemailer from 'nodemailer'
import { afterEach, describe, expect, it } from 'vitest'

import { startSmtpSink, type SmtpSink } from '@root/e2e/support/smtpSink'

/**
 * El receptor SMTP de los E2E (`e2e/support/smtpSink.ts`) no se ejecuta hasta
 * la ejecución nocturna: aquí se comprueba contra el nodemailer real, con la
 * misma configuración que `mailer.ts` (sin TLS y con login), para que un fallo
 * del receptor no se descubra a las 00:07.
 */

let sink: SmtpSink | null = null

afterEach(async () => {
  await sink?.close()
  sink = null
})

function transport(port: number) {
  return nodemailer.createTransport({
    host: '127.0.0.1',
    port,
    secure: false,
    auth: { user: 'e2e', pass: 'e2e' },
  })
}

describe('receptor SMTP de los E2E', () => {
  it('recibe un mensaje de nodemailer con login y lo deja legible', async () => {
    sink = await startSmtpSink(0)

    await transport(sink.port).sendMail({
      from: 'no-reply@e2e.test',
      to: 'hi@e2e.test',
      replyTo: 'ana@example.test',
      subject: 'Nuevo mensaje de contacto — Ana García',
      text: 'Nombre: Ana García\nTeléfono: +34 600 000 000\n\nHola, queremos hablar.',
      html: '<p><strong>Teléfono:</strong> +34 600 000 000</p>',
    })

    expect(sink.mails).toHaveLength(1)
    const [mail] = sink.mails
    expect(mail.envelopeFrom).toBe('no-reply@e2e.test')
    expect(mail.envelopeTo).toEqual(['hi@e2e.test'])
    expect(mail.headers['reply-to']).toBe('ana@example.test')
    expect(mail.headers.subject).toBe('Nuevo mensaje de contacto — Ana García')
    expect(mail.body).toContain('Nombre: Ana García')
    expect(mail.body).toContain('Teléfono: +34 600 000 000')
    expect(mail.body).toContain('Hola, queremos hablar.')
  })

  it('guarda cada mensaje por separado y descodifica líneas largas', async () => {
    sink = await startSmtpSink(0)
    const long = 'palabra '.repeat(40).trim()

    const smtp = transport(sink.port)
    await smtp.sendMail({
      from: 'a@e2e.test',
      to: 'x@e2e.test',
      subject: 'Uno',
      text: long,
    })
    await smtp.sendMail({
      from: 'b@e2e.test',
      to: 'y@e2e.test',
      subject: 'Dos',
      text: 'Segundo',
    })

    expect(sink.mails.map((m) => m.headers.subject)).toEqual(['Uno', 'Dos'])
    expect(sink.mails[0].body).toContain(long)
    expect(sink.mails[1].envelopeTo).toEqual(['y@e2e.test'])
  })

  it('libera el puerto al cerrarse', async () => {
    const first = await startSmtpSink(0)
    const { port } = first
    await first.close()

    sink = await startSmtpSink(port)
    expect(sink.port).toBe(port)
  })
})
