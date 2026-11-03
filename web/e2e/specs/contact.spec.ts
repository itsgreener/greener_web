import { rejectCookies } from '../support/consent'
import { startSmtpSink, type SmtpSink } from '../support/smtpSink'
import { expect, test } from '../support/test'

/**
 * El puerto es el que `scripts/e2e-env.mjs` le da al servidor
 * (`CONTACT_SMTP_PORT`): el receptor escucha donde la web va a enviar.
 */
function smtpPort(): number {
  const port = Number(process.env.CONTACT_SMTP_PORT)
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(
      'Falta CONTACT_SMTP_PORT: las variables de scripts/e2e-env.mjs no están cargadas.',
    )
  }
  return port
}

// E7 — formulario de contacto (plan de mejoras §9.3 y §2).
test.describe('Contacto', () => {
  let sink: SmtpSink

  test.beforeAll(async () => {
    sink = await startSmtpSink(smtpPort())
  })

  test.afterAll(async () => {
    await sink.close()
  })

  test('E7: un error conserva lo escrito y el envío correcto llega al buzón', async ({
    page,
    consoleProblems,
  }) => {
    const before = sink.mails.length

    await page.goto('/contact')
    await rejectCookies(page)
    // El navegador deja pasar un nombre de solo espacios (no está vacío); el
    // servidor lo recorta y lo rechaza.
    await page.getByLabel('Name').fill('   ')
    await page.getByLabel('Phone').fill('+34 600 000 000')
    await page.getByLabel('Email').fill('ana@example.test')
    await page
      .getByLabel('Message')
      .fill('Hello from the E2E suite, we would like to talk about a brand.')
    await page.getByRole('button', { name: 'Send' }).click()

    await expect(page.getByText('Name is required')).toBeVisible()
    // Lo escrito sigue ahí (React reinicia el formulario al terminar la acción).
    await expect(page.getByLabel('Phone')).toHaveValue('+34 600 000 000')
    await expect(page.getByLabel('Email')).toHaveValue('ana@example.test')
    await expect(page.getByLabel('Message')).toHaveValue(
      'Hello from the E2E suite, we would like to talk about a brand.',
    )
    expect(sink.mails.length).toBe(before)

    await page.getByLabel('Name').fill('Ana Test')
    await page.getByRole('button', { name: 'Send' }).click()

    await expect(page.getByRole('status')).toContainText(
      'Thanks for writing to us',
    )

    await expect.poll(() => sink.mails.length).toBe(before + 1)
    const mail = sink.mails[before]
    expect(mail.envelopeTo).toEqual(['hi@e2e.test'])
    expect(mail.headers['reply-to']).toBe('ana@example.test')
    expect(mail.headers.subject).toContain('Ana Test')
    expect(mail.body).toContain('Ana Test')
    expect(mail.body).toContain('+34 600 000 000')
    expect(mail.body).toContain(
      'Hello from the E2E suite, we would like to talk about a brand.',
    )

    expect(consoleProblems).toEqual([])
  })
})
