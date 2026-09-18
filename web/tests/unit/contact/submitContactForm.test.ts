import { describe, it, expect, vi, beforeEach } from 'vitest'

const VALID_INPUT = {
  name: 'Marta García',
  phone: '+34 600 000 000',
  email: 'marta@example.com',
  message: 'Hola, quería preguntaros por vuestros servicios.',
  privacyConsent: true,
}

vi.mock('@/modules/contact/infrastructure/mailer', () => ({
  sendContactEmail: vi.fn(),
}))

vi.mock('@/modules/contact/infrastructure/clientIp', () => ({
  getHashedClientIp: vi.fn(async () => 'hash-1'),
}))

vi.mock('@/modules/contact/infrastructure/contactSubmissionLog', () => ({
  isRateLimited: vi.fn(async () => false),
  logContactSubmission: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('submitContactForm', () => {
  it('con datos válidos, envía el email y registra "sent"', async () => {
    const { submitContactForm } =
      await import('@/modules/contact/application/submitContactForm')
    const { sendContactEmail } =
      await import('@/modules/contact/infrastructure/mailer')
    const { logContactSubmission } =
      await import('@/modules/contact/infrastructure/contactSubmissionLog')

    const result = await submitContactForm(VALID_INPUT, '')

    expect(result).toEqual({ ok: true })
    expect(sendContactEmail).toHaveBeenCalledWith(VALID_INPUT)
    expect(logContactSubmission).toHaveBeenCalledWith('hash-1', 'sent')
  })

  it('con el honeypot relleno, finge éxito sin validar ni enviar nada — no hay que delatar al bot (§14.1)', async () => {
    const { submitContactForm } =
      await import('@/modules/contact/application/submitContactForm')
    const { sendContactEmail } =
      await import('@/modules/contact/infrastructure/mailer')
    const { logContactSubmission } =
      await import('@/modules/contact/infrastructure/contactSubmissionLog')

    // Ni siquiera con datos por lo demás inválidos debería fallar el
    // "éxito" fingido — el honeypot se comprueba antes que nada.
    const result = await submitContactForm(
      { name: '', phone: '', email: 'no-es-un-email', message: '' },
      'un bot ha rellenado esto',
    )

    expect(result).toEqual({ ok: true })
    expect(sendContactEmail).not.toHaveBeenCalled()
    expect(logContactSubmission).toHaveBeenCalledWith('hash-1', 'honeypot')
  })

  it('con datos inválidos, devuelve fieldErrors sin llegar a comprobar el límite ni enviar nada', async () => {
    const { submitContactForm } =
      await import('@/modules/contact/application/submitContactForm')
    const { sendContactEmail } =
      await import('@/modules/contact/infrastructure/mailer')
    const { isRateLimited } =
      await import('@/modules/contact/infrastructure/contactSubmissionLog')

    const result = await submitContactForm(
      { ...VALID_INPUT, email: 'no-es-un-email' },
      '',
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect('fieldErrors' in result).toBe(true)
    }
    expect(sendContactEmail).not.toHaveBeenCalled()
    expect(isRateLimited).not.toHaveBeenCalled()
  })

  it('si isRateLimited devuelve true, no envía nada y registra "rate_limited"', async () => {
    const { submitContactForm } =
      await import('@/modules/contact/application/submitContactForm')
    const { sendContactEmail } =
      await import('@/modules/contact/infrastructure/mailer')
    const { isRateLimited, logContactSubmission } =
      await import('@/modules/contact/infrastructure/contactSubmissionLog')
    vi.mocked(isRateLimited).mockResolvedValueOnce(true)

    const result = await submitContactForm(VALID_INPUT, '')

    expect(result.ok).toBe(false)
    if (!result.ok && 'formError' in result) {
      expect(result.formError).toContain('demasiados mensajes')
    }
    expect(sendContactEmail).not.toHaveBeenCalled()
    expect(logContactSubmission).toHaveBeenCalledWith('hash-1', 'rate_limited')
  })

  it('si el envío SMTP falla, devuelve un formError y registra "failed" con el motivo', async () => {
    const { submitContactForm } =
      await import('@/modules/contact/application/submitContactForm')
    const { sendContactEmail } =
      await import('@/modules/contact/infrastructure/mailer')
    const { logContactSubmission } =
      await import('@/modules/contact/infrastructure/contactSubmissionLog')
    vi.mocked(sendContactEmail).mockRejectedValueOnce(new Error('SMTP caído'))

    const result = await submitContactForm(VALID_INPUT, '')

    expect(result.ok).toBe(false)
    if (!result.ok && 'formError' in result) {
      expect(result.formError).toContain('No se ha podido enviar')
    }
    expect(logContactSubmission).toHaveBeenCalledWith(
      'hash-1',
      'failed',
      'SMTP caído',
    )
  })
})
