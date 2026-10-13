import { describe, it, expect, vi } from 'vitest'

import { makeSubmitContactForm } from '@/modules/contact/application/submitContactForm'

const VALID_INPUT = {
  name: 'Marta García',
  phone: '+34 600 000 000',
  email: 'marta@example.com',
  message: 'Hola, quería preguntaros por vuestros servicios.',
  privacyConsent: true,
}

/** El caso de uso sobre puertos falsos: sin SMTP, sin Supabase, sin cabeceras. */
function setup() {
  const mailer = { send: vi.fn<(input: unknown) => Promise<void>>() }
  const log = {
    isRateLimited: vi.fn(async () => false),
    record: vi.fn(async () => {}),
  }
  const submitContactForm = makeSubmitContactForm({
    mailer,
    log,
    clientKey: async () => 'hash-1',
  })

  return { submitContactForm, mailer, log }
}

describe('submitContactForm', () => {
  it('con datos válidos, envía el email y registra "sent"', async () => {
    const { submitContactForm, mailer, log } = setup()

    const result = await submitContactForm(VALID_INPUT, '')

    expect(result).toEqual({ ok: true })
    expect(mailer.send).toHaveBeenCalledWith(VALID_INPUT)
    expect(log.record).toHaveBeenCalledWith('hash-1', 'sent')
  })

  it('con el honeypot relleno, finge éxito sin validar ni enviar nada — no hay que delatar al bot (§14.1)', async () => {
    const { submitContactForm, mailer, log } = setup()

    // Ni siquiera con datos por lo demás inválidos debería fallar el
    // "éxito" fingido — el honeypot se comprueba antes que nada.
    const result = await submitContactForm(
      { name: '', phone: '', email: 'no-es-un-email', message: '' },
      'un bot ha rellenado esto',
    )

    expect(result).toEqual({ ok: true })
    expect(mailer.send).not.toHaveBeenCalled()
    expect(log.record).toHaveBeenCalledWith('hash-1', 'honeypot')
  })

  it('con datos inválidos, devuelve fieldErrors sin llegar a comprobar el límite ni enviar nada', async () => {
    const { submitContactForm, mailer, log } = setup()

    const result = await submitContactForm(
      { ...VALID_INPUT, email: 'no-es-un-email' },
      '',
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect('fieldErrors' in result).toBe(true)
    }
    expect(mailer.send).not.toHaveBeenCalled()
    expect(log.isRateLimited).not.toHaveBeenCalled()
  })

  it('si isRateLimited devuelve true, no envía nada y registra "rate_limited"', async () => {
    const { submitContactForm, mailer, log } = setup()
    log.isRateLimited.mockResolvedValueOnce(true)

    const result = await submitContactForm(VALID_INPUT, '')

    expect(result.ok).toBe(false)
    if (!result.ok && 'formError' in result) {
      expect(result.formError).toContain('too many messages')
    }
    expect(mailer.send).not.toHaveBeenCalled()
    expect(log.record).toHaveBeenCalledWith('hash-1', 'rate_limited')
  })

  it('si el envío SMTP falla, devuelve un formError y registra "failed" con el motivo', async () => {
    const { submitContactForm, mailer, log } = setup()
    mailer.send.mockRejectedValueOnce(new Error('SMTP caído'))

    const result = await submitContactForm(VALID_INPUT, '')

    expect(result.ok).toBe(false)
    if (!result.ok && 'formError' in result) {
      expect(result.formError).toContain("couldn't send your message")
    }
    expect(log.record).toHaveBeenCalledWith('hash-1', 'failed', 'SMTP caído')
  })
})
