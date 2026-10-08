import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/modules/newsletter/application/subscribeToNewsletter', () => ({
  subscribeToNewsletter: vi.fn(),
}))

import {
  NEWSLETTER_SUCCESS_MESSAGE,
  subscribeNewsletterAction,
} from '@/app/(public)/contact/newsletterActions'
import { subscribeToNewsletter } from '@/modules/newsletter/application/subscribeToNewsletter'

const mockSubscribe = vi.mocked(subscribeToNewsletter)

function form(entries: Record<string, string>) {
  const data = new FormData()
  for (const [k, v] of Object.entries(entries)) data.set(k, v)
  return data
}

beforeEach(() => vi.clearAllMocks())

describe('subscribeNewsletterAction', () => {
  it('pasa el email (campo newsletterEmail) y el honeypot (company)', async () => {
    mockSubscribe.mockResolvedValueOnce({
      ok: true,
      status: 'confirmation_sent',
      newSubscription: true,
    })

    await subscribeNewsletterAction(
      {},
      form({ newsletterEmail: 'a@example.com', company: 'x' }),
    )

    expect(mockSubscribe).toHaveBeenCalledWith({ email: 'a@example.com' }, 'x')
  })

  it('sin honeypot en el formulario, se pasa vacío', async () => {
    mockSubscribe.mockResolvedValueOnce({
      ok: true,
      status: 'confirmation_sent',
      newSubscription: true,
    })

    await subscribeNewsletterAction({}, form({ newsletterEmail: 'a@b.co' }))

    expect(mockSubscribe).toHaveBeenCalledWith({ email: 'a@b.co' }, '')
  })

  it.each([
    'confirmation_sent',
    'confirmation_pending',
    'already_subscribed',
  ] as const)(
    'estado %s: MISMA respuesta (no revela si el email ya estaba en la lista)',
    async (status) => {
      mockSubscribe.mockResolvedValueOnce({
        ok: true,
        status,
        newSubscription: status === 'confirmation_sent',
      })

      const state = await subscribeNewsletterAction(
        {},
        form({ newsletterEmail: 'a@example.com' }),
      )

      expect(state.success).toBe(true)
      expect(state.message).toBe(NEWSLETTER_SUCCESS_MESSAGE)
      // Lo único que cambia es lo que cuenta para la analítica.
      expect(state.newSubscription).toBe(status === 'confirmation_sent')
    },
  )

  it('el éxito silencioso del honeypot no cuenta como alta', async () => {
    mockSubscribe.mockResolvedValueOnce({
      ok: true,
      status: 'confirmation_sent',
      newSubscription: false,
    })

    const state = await subscribeNewsletterAction(
      {},
      form({ newsletterEmail: 'bot@example.com', company: 'x' }),
    )

    expect(state.success).toBe(true)
    expect(state.newSubscription).toBe(false)
  })

  it('errores de campo y de formulario se devuelven tal cual, sin success', async () => {
    mockSubscribe.mockResolvedValueOnce({
      ok: false,
      fieldErrors: { email: ['Enter a valid email address.'] },
    })

    expect(
      await subscribeNewsletterAction({}, form({ newsletterEmail: 'x' })),
    ).toEqual({ fieldErrors: { email: ['Enter a valid email address.'] } })

    mockSubscribe.mockResolvedValueOnce({ ok: false, formError: 'Nope' })

    expect(
      await subscribeNewsletterAction({}, form({ newsletterEmail: 'a@b.co' })),
    ).toEqual({ formError: 'Nope' })
  })
})
