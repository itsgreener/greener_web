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

// El diseño final lleva el titular fijo y no pinta `title` ni `text`: siguen
// viajando en el item (los edita el ABM) pero la tarjeta no los usa.
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
  fireEvent.change(screen.getByLabelText('Your email'), {
    target: { value: email },
  })
  // jsdom no valida ni dispara el envío con el clic del botón de la misma
  // forma que un navegador: se envía el formulario directamente.
  fireEvent.submit(screen.getByLabelText('Your email').closest('form')!)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('NewsletterPinCard — contenido', () => {
  it('pinta el titular fijo, el email y el botón', () => {
    renderCard()

    expect(
      screen.getByRole('heading', {
        name: 'Like what you see? We’ll write you when there’s more',
      }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Your email')).toHaveAttribute('type', 'email')
    expect(
      screen.getByRole('button', { name: 'Subscribe to newsletter' }),
    ).toBeInTheDocument()
  })

  it('no pinta el título ni el texto de apoyo del item', () => {
    renderCard()

    expect(screen.queryByText(ITEM.title)).not.toBeInTheDocument()
    expect(screen.queryByText(ITEM.text!)).not.toBeInTheDocument()
  })

  it('lleva el enlace a /privacy#newsletter junto a la casilla', () => {
    renderCard()

    const link = screen.getByRole('link', { name: 'Privacy Policy' })
    expect(link).toHaveAttribute('href', '/privacy#newsletter')
    expect(link.closest('label')).toContainElement(screen.getByRole('checkbox'))
  })

  it('el botón queda desactivado hasta aceptar la política de privacidad', () => {
    renderCard()

    const button = screen.getByRole('button', {
      name: 'Subscribe to newsletter',
    })
    expect(button).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox'))
    expect(button).toBeEnabled()

    fireEvent.click(screen.getByRole('checkbox'))
    expect(button).toBeDisabled()
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

    expect(screen.getByLabelText('Your email')).toHaveAttribute(
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
    expect(screen.queryByLabelText('Your email')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()

    // La analítica y el aviso al feed salen de un efecto que corre después de
    // pintar la confirmación: con la máquina cargada llegaba tarde y la
    // aserción inmediata fallaba de vez en cuando.
    await waitFor(() => {
      expect(onSubscribed).toHaveBeenCalledWith('newsletter:n1:0')
    })
    expect(mocks.track).toHaveBeenCalledTimes(1)
    expect(mocks.track).toHaveBeenCalledWith(
      'Newsletter Signup',
      { placement: 'feed' },
      { interactive: true },
    )
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
    await waitFor(() => {
      expect(onSubscribed).toHaveBeenCalledTimes(1)
    })
    expect(mocks.track).not.toHaveBeenCalled()
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
    expect(screen.getByLabelText('Your email')).toBeInTheDocument()
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
