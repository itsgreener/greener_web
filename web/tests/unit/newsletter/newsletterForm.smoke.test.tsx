// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('@/modules/analytics/analytics', () => ({
  trackAnalyticsEvent: vi.fn(),
}))

vi.mock('@/app/(public)/contact/newsletterActions', () => ({
  subscribeNewsletterAction: vi.fn(),
}))

import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
import { NewsletterForm } from '@/app/(public)/contact/NewsletterForm'
import { subscribeNewsletterAction } from '@/app/(public)/contact/newsletterActions'

describe('NewsletterForm — prueba de humo', () => {
  it('pinta el email obligatorio, el botón y el enlace a la política en pestaña nueva', () => {
    render(<NewsletterForm />)

    expect(screen.getByLabelText('Email')).toBeRequired()
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeEnabled()

    const link = screen.getByRole('link', { name: /Privacy & Cookies policy/ })

    expect(link).toHaveAttribute('href', '/privacy')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('el honeypot existe pero no es alcanzable por teclado ni anunciado', () => {
    const { container } = render(<NewsletterForm />)

    const honeypot = container.querySelector('input[name="company"]')

    expect(honeypot).toHaveAttribute('tabIndex', '-1')
    expect(honeypot).toHaveAttribute('autoComplete', 'off')
    expect(honeypot?.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('el campo del email se llama newsletterEmail (lo que lee la acción)', () => {
    render(<NewsletterForm />)

    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'name',
      'newsletterEmail',
    )
  })

  it('tras un alta correcta sustituye el formulario por el mensaje', async () => {
    vi.mocked(subscribeNewsletterAction).mockResolvedValueOnce({
      success: true,
      message: 'Check your inbox.',
    })

    render(<NewsletterForm />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'a@example.com' },
    })
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!)

    expect(await screen.findByText('Check your inbox.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('muestra el error de campo y el de formulario', async () => {
    vi.mocked(subscribeNewsletterAction).mockResolvedValueOnce({
      fieldErrors: { email: ['Enter a valid email address.'] },
      formError: 'Too many attempts. Please try again later.',
    })

    render(<NewsletterForm />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'a@example.com' },
    })
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!)

    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Too many attempts. Please try again later.'),
    ).toBeInTheDocument()
  })

  async function submitWith(
    state: Awaited<ReturnType<typeof subscribeNewsletterAction>>,
  ) {
    vi.mocked(subscribeNewsletterAction).mockResolvedValueOnce(state)

    render(<NewsletterForm />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'a@example.com' },
    })
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!)

    await screen.findByText(state.message ?? 'x')
  }

  it('un alta nueva dispara «Newsletter Signup» una sola vez', async () => {
    vi.mocked(trackAnalyticsEvent).mockClear()

    await submitWith({
      success: true,
      newSubscription: true,
      message: 'Check your inbox.',
    })

    expect(trackAnalyticsEvent).toHaveBeenCalledTimes(1)
    expect(trackAnalyticsEvent).toHaveBeenCalledWith('Newsletter Signup', {
      placement: 'contact',
    })
  })

  it('ya suscrito, pendiente o éxito silencioso del honeypot: no dispara el evento', async () => {
    vi.mocked(trackAnalyticsEvent).mockClear()

    await submitWith({
      success: true,
      newSubscription: false,
      message: 'You are already subscribed.',
    })

    expect(trackAnalyticsEvent).not.toHaveBeenCalled()
  })

  it('un error no dispara el evento', async () => {
    vi.mocked(trackAnalyticsEvent).mockClear()
    vi.mocked(subscribeNewsletterAction).mockResolvedValueOnce({
      formError: 'Nope',
    })

    render(<NewsletterForm />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'a@example.com' },
    })
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!)

    await screen.findByText('Nope')

    expect(trackAnalyticsEvent).not.toHaveBeenCalled()
  })
})
