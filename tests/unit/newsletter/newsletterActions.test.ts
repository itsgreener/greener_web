import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/modules/newsletter/container', () => ({
  subscribeToNewsletter: vi.fn(),
}))

const cookieSet = vi.fn()
vi.mock('next/headers', () => ({
  cookies: async () => ({ set: cookieSet }),
}))

import { subscribeNewsletterAction } from '@/app/_actions/newsletterActions'
import { NEWSLETTER_SUCCESS_MESSAGE } from '@/modules/newsletter/domain/newsletterMessages'
import { subscribeToNewsletter } from '@/modules/newsletter/container'

const mockSubscribe = vi.mocked(subscribeToNewsletter)

function form(entries: Record<string, string>) {
  const data = new FormData()
  for (const [k, v] of Object.entries(entries)) data.set(k, v)
  return data
}

beforeEach(() => vi.clearAllMocks())

describe('subscribeNewsletterAction', () => {
  it('pasa el email (campo newsletterEmail) y el honeypot (reference_code)', async () => {
    mockSubscribe.mockResolvedValueOnce({
      ok: true,
      status: 'confirmation_sent',
      newSubscription: true,
    })

    await subscribeNewsletterAction(
      {},
      form({ newsletterEmail: 'a@example.com', reference_code: 'x' }),
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
      silent: true,
    })

    const state = await subscribeNewsletterAction(
      {},
      form({ newsletterEmail: 'bot@example.com', reference_code: 'x' }),
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

  describe('cookie greener_newsletter', () => {
    it.each([
      'confirmation_sent',
      'confirmation_pending',
      'already_subscribed',
    ] as const)(
      'estado %s: el servidor la escribe, a 12 meses, legible por el cliente',
      async (status) => {
        mockSubscribe.mockResolvedValueOnce({
          ok: true,
          status,
          newSubscription: status === 'confirmation_sent',
        })

        await subscribeNewsletterAction(
          {},
          form({ newsletterEmail: 'a@example.com' }),
        )

        expect(cookieSet).toHaveBeenCalledTimes(1)
        expect(cookieSet).toHaveBeenCalledWith('greener_newsletter', '1', {
          httpOnly: false,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 365 * 24 * 60 * 60,
        })
      },
    )

    it('NO se escribe en el éxito silencioso del honeypot', async () => {
      mockSubscribe.mockResolvedValueOnce({
        ok: true,
        status: 'confirmation_sent',
        newSubscription: false,
        silent: true,
      })

      await subscribeNewsletterAction(
        {},
        form({ newsletterEmail: 'bot@example.com', reference_code: 'x' }),
      )

      expect(cookieSet).not.toHaveBeenCalled()
    })

    it('NO se escribe si el alta falla (campo inválido, límite o Mailchimp)', async () => {
      mockSubscribe.mockResolvedValueOnce({
        ok: false,
        fieldErrors: { email: ['Enter a valid email address.'] },
      })
      mockSubscribe.mockResolvedValueOnce({ ok: false, formError: 'Nope' })

      await subscribeNewsletterAction({}, form({ newsletterEmail: 'x' }))
      await subscribeNewsletterAction({}, form({ newsletterEmail: 'a@b.co' }))

      expect(cookieSet).not.toHaveBeenCalled()
    })
  })
})
