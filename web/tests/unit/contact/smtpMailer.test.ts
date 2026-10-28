import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendMail = vi.fn().mockResolvedValue({})
const createTransport = vi.fn(() => ({ sendMail }))

vi.mock('nodemailer', () => ({ default: { createTransport } }))

const input = {
  name: 'Ada',
  phone: '600000000',
  email: 'ada@example.com',
  message: 'Hola, quiero hablar de un proyecto.',
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv('CONTACT_SMTP_HOST', 'smtp.example.com')
  vi.stubEnv('CONTACT_SMTP_PORT', '465')
  vi.stubEnv('CONTACT_SMTP_SECURE', 'true')
  vi.stubEnv('CONTACT_SMTP_USER', 'user@example.com')
  vi.stubEnv('CONTACT_SMTP_PASSWORD', 'secret')
  vi.stubEnv('CONTACT_EMAIL_TO', 'to@example.com')
  vi.stubEnv('CONTACT_EMAIL_FROM', 'from@example.com')
})

describe('smtpContactMailer', () => {
  it('crea el transporte con tiempos máximos cortos (un SMTP caído no cuelga el formulario)', async () => {
    const { smtpContactMailer, SMTP_TIMEOUTS } =
      await import('@/modules/contact/infrastructure/mailer')

    await smtpContactMailer.send(input)

    expect(createTransport).toHaveBeenCalledTimes(1)
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 465,
        secure: true,
        ...SMTP_TIMEOUTS,
      }),
    )
    expect(SMTP_TIMEOUTS.connectionTimeout).toBeLessThanOrEqual(15_000)
    expect(SMTP_TIMEOUTS.greetingTimeout).toBeLessThanOrEqual(15_000)
    expect(SMTP_TIMEOUTS.socketTimeout).toBeLessThanOrEqual(30_000)
  })

  it('responde al email del visitante y reutiliza el transporte', async () => {
    const { smtpContactMailer } =
      await import('@/modules/contact/infrastructure/mailer')

    await smtpContactMailer.send(input)
    await smtpContactMailer.send(input)

    expect(createTransport).toHaveBeenCalledTimes(1)
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: 'ada@example.com',
        to: 'to@example.com',
        from: 'from@example.com',
      }),
    )
  })

  it('propaga el fallo del SMTP para que el caso de uso lo registre', async () => {
    sendMail.mockRejectedValueOnce(
      Object.assign(new Error('x'), { code: 'ETIMEDOUT' }),
    )
    const { smtpContactMailer } =
      await import('@/modules/contact/infrastructure/mailer')

    await expect(smtpContactMailer.send(input)).rejects.toMatchObject({
      code: 'ETIMEDOUT',
    })
  })
})
