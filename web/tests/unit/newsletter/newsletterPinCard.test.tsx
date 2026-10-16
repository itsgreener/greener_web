// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  action: vi.fn(),
  track: vi.fn(),
}))

vi.mock('@/app/_actions/newsletterActions', () => ({
  subscribeNewsletterAction: (...args: unknown[]) => mocks.action(...args),
}))

vi.mock('@/modules/analytics/analytics', () => ({
  trackAnalyticsEvent: (...args: unknown[]) => mocks.track(...args),
}))

import { NewsletterPinCard } from '@/components/newsletter/NewsletterPinCard'
import type { FeedNewsletterItem } from '@/modules/feed/domain/feedReadModels'

const ITEM: FeedNewsletterItem = {
  kind: 'newsletter',
  pinId: 'newsletter:n1:0',
  contentId: 'n1',
  title: 'Brand news, once a month',
  text: 'Insights, tools and episodes straight to your inbox.',
}

const STYLE = { x: 12, y: 40, width: 200, height: 250 }

function renderCard(
  overrides: Partial<FeedNewsletterItem> = {},
  onSubscribed = vi.fn(),
) {
  render(
    <NewsletterPinCard
      item={{ ...ITEM, ...overrides }}
      style={STYLE}
      onSubscribed={onSubscribed}
    />,
  )
  return { onSubscribed }
}

function submit(email = 'a@example.com') {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: email },
  })
  // jsdom no valida ni dispara el envío con el clic del botón de la misma
  // forma que un navegador: se envía el formulario directamente.
  fireEvent.submit(screen.getByLabelText('Email').closest('form')!)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('NewsletterPinCard — contenido', () => {
  it('pinta titular, texto de apoyo, email y botón', () => {
    renderCard()

    expect(
      screen.getByRole('heading', { name: ITEM.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(ITEM.text!)).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
    expect(
      screen.getByRole('button', { name: 'Subscribe' }),
    ).toBeInTheDocument()
  })

  it('sin texto de apoyo, no pinta el párrafo', () => {
    renderCard({ text: null })

    expect(screen.queryByText(ITEM.text!)).not.toBeInTheDocument()
  })

  it('lleva antes del botón el enlace a /privacy#newsletter', () => {
    renderCard()

    const link = screen.getByRole('link', { name: 'Privacy' })
    expect(link).toHaveAttribute('href', '/privacy#newsletter')

    const button = screen.getByRole('button', { name: 'Subscribe' })
    expect(
      link.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('se coloca por transform en su sitio de la retícula y ocupa una columna', () => {
    renderCard()

    const card = screen.getByRole('region', { name: 'Newsletter' })
    expect(card.style.transform).toBe('translate(12px, 40px)')
    expect(card.style.width).toBe('200px')
  })

  it('el honeypot se llama «company» y está fuera del flujo de tabulación', () => {
    renderCard()

    const honeypot = document.querySelector('input[name="company"]')
    expect(honeypot).not.toBeNull()
    expect(honeypot).toHaveAttribute('tabindex', '-1')
    expect(honeypot!.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('el campo se llama newsletterEmail, el que lee la acción', () => {
    renderCard()

    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'name',
      'newsletterEmail',
    )
  })
})

describe('NewsletterPinCard — alta', () => {
  it('alta nueva: muestra la confirmación, cuenta «Newsletter Signup» y avisa al feed', async () => {
    mocks.action.mockResolvedValueOnce({
      success: true,
      newSubscription: true,
      message: 'Thanks! Check your inbox.',
    })
    const { onSubscribed } = renderCard()

    submit()

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Thanks! Check your inbox.',
    )
    // Con el alta hecha solo queda la confirmación.
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()

    expect(mocks.track).toHaveBeenCalledTimes(1)
    expect(mocks.track).toHaveBeenCalledWith(
      'Newsletter Signup',
      { placement: 'feed' },
      { interactive: true },
    )
    expect(onSubscribed).toHaveBeenCalledWith('newsletter:n1:0')
  })

  it('pendiente o ya suscrito: confirmación y retirada de tarjetas, pero sin evento', async () => {
    mocks.action.mockResolvedValueOnce({
      success: true,
      newSubscription: false,
      message: 'Thanks! Check your inbox.',
    })
    const { onSubscribed } = renderCard()

    submit()

    await screen.findByRole('status')
    expect(mocks.track).not.toHaveBeenCalled()
    expect(onSubscribed).toHaveBeenCalledTimes(1)
  })

  it('error de campo: lo enseña y no retira nada ni cuenta nada', async () => {
    mocks.action.mockResolvedValueOnce({
      fieldErrors: { email: ['Enter a valid email address.'] },
    })
    const { onSubscribed } = renderCard()

    submit('no-es-un-email')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter a valid email address.',
    )
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(mocks.track).not.toHaveBeenCalled()
    expect(onSubscribed).not.toHaveBeenCalled()
  })

  it('error del servidor (límite, Mailchimp): lo enseña en la misma tarjeta', async () => {
    mocks.action.mockResolvedValueOnce({
      formError: 'Too many attempts. Please try again later.',
    })
    renderCard()

    submit()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Too many attempts. Please try again later.',
      ),
    )
  })
})
