import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/modules/contact/infrastructure/clientIp', () => ({
  getHashedClientIp: vi.fn(async () => 'ip-hash-1'),
}))

vi.mock('@/modules/newsletter/infrastructure/mailchimpNewsletter', () => ({
  subscribeEmailInMailchimp: vi.fn(),
}))

import { getHashedClientIp } from '@/modules/contact/infrastructure/clientIp'
import {
  NEWSLETTER_MAX_PER_WINDOW,
  subscribeToNewsletter,
} from '@/modules/newsletter/application/subscribeToNewsletter'
import { subscribeEmailInMailchimp } from '@/modules/newsletter/infrastructure/mailchimpNewsletter'

const mockMailchimp = vi.mocked(subscribeEmailInMailchimp)
const mockIp = vi.mocked(getHashedClientIp)

let ipCounter = 0

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  // El limitador vive en el módulo: cada test usa una IP distinta para no
  // heredar el contador del anterior.
  ipCounter += 1
  mockIp.mockResolvedValue(`ip-hash-${ipCounter}`)
  mockMailchimp.mockResolvedValue({ status: 'confirmation_sent' })
})

describe('subscribeToNewsletter', () => {
  it('email válido: suscribe y devuelve el estado de Mailchimp', async () => {
    mockMailchimp.mockResolvedValueOnce({ status: 'already_subscribed' })

    const result = await subscribeToNewsletter({ email: 'a@example.com' }, '')

    expect(result).toEqual({
      ok: true,
      status: 'already_subscribed',
      newSubscription: false,
    })
    expect(mockMailchimp).toHaveBeenCalledWith('a@example.com')
  })

  it('el límite por IP deja pasar a varias personas con la misma IP (oficina, stand)', () => {
    expect(NEWSLETTER_MAX_PER_WINDOW).toBeGreaterThanOrEqual(20)
  })

  it('honeypot relleno: éxito silencioso, sin llamar a Mailchimp ni al limitador', async () => {
    const result = await subscribeToNewsletter(
      { email: 'bot@example.com' },
      'Acme',
    )

    expect(result).toEqual({
      ok: true,
      status: 'confirmation_sent',
      newSubscription: false,
    })
    expect(mockMailchimp).not.toHaveBeenCalled()
    expect(mockIp).not.toHaveBeenCalled()
  })

  it('un honeypot solo con espacios no cuenta como bot', async () => {
    await subscribeToNewsletter({ email: 'a@example.com' }, '   ')

    expect(mockMailchimp).toHaveBeenCalledTimes(1)
  })

  it('email inválido: errores de campo y nada de Mailchimp', async () => {
    const result = await subscribeToNewsletter({ email: 'no-es-email' }, '')

    expect(result.ok).toBe(false)

    if (!result.ok && 'fieldErrors' in result) {
      expect(result.fieldErrors.email?.[0]).toBe('Enter a valid email address.')
    } else {
      throw new Error('Se esperaban fieldErrors')
    }

    expect(mockMailchimp).not.toHaveBeenCalled()
  })

  it('al pasar el máximo por IP en la ventana, se rechaza', async () => {
    for (let i = 0; i < NEWSLETTER_MAX_PER_WINDOW; i += 1) {
      const ok = await subscribeToNewsletter({ email: 'a@example.com' }, '')
      expect(ok.ok).toBe(true)
    }

    const blocked = await subscribeToNewsletter({ email: 'a@example.com' }, '')

    expect(blocked).toEqual({
      ok: false,
      formError: 'Too many attempts. Please try again later.',
    })
    expect(mockMailchimp).toHaveBeenCalledTimes(NEWSLETTER_MAX_PER_WINDOW)
  })

  it('el límite es por IP: otra IP no se ve afectada', async () => {
    mockIp.mockResolvedValue('ip-bloqueada')

    for (let i = 0; i < NEWSLETTER_MAX_PER_WINDOW + 1; i += 1) {
      await subscribeToNewsletter({ email: 'a@example.com' }, '')
    }

    mockIp.mockResolvedValue('ip-distinta')

    const result = await subscribeToNewsletter({ email: 'a@example.com' }, '')

    expect(result.ok).toBe(true)
  })

  it('los intentos con email inválido no gastan cuota', async () => {
    mockIp.mockResolvedValue('ip-cuota')

    for (let i = 0; i < NEWSLETTER_MAX_PER_WINDOW * 2; i += 1) {
      await subscribeToNewsletter({ email: 'malo' }, '')
    }

    const result = await subscribeToNewsletter({ email: 'a@example.com' }, '')

    expect(result.ok).toBe(true)
  })

  it('dirección no entregable (cleaned): mensaje específico', async () => {
    mockMailchimp.mockRejectedValueOnce(
      new Error('This email cannot be subscribed ... undeliverable.'),
    )

    const result = await subscribeToNewsletter({ email: 'a@example.com' }, '')

    expect(result).toEqual({
      ok: false,
      formError:
        'This email address cannot be subscribed. Please use another one.',
    })
  })

  it('cualquier otro fallo: mensaje genérico, sin filtrar el motivo', async () => {
    mockMailchimp.mockRejectedValueOnce(new Error('API Key Invalid us21'))

    const result = await subscribeToNewsletter({ email: 'a@example.com' }, '')

    expect(result).toEqual({
      ok: false,
      formError:
        'We could not subscribe you right now. Please try again later.',
    })
  })
})
