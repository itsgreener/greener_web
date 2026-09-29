// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ContactForm } from '@/app/(public)/contact/ContactForm'

vi.mock('@/app/(public)/contact/contactActions', () => ({
  submitContactAction: vi.fn(),
}))

describe('ContactForm — prueba de humo', () => {
  it('pinta los campos: name, phone, email, message y el consentimiento de privacidad', () => {
    render(<ContactForm />)

    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Phone')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toBeInTheDocument()
    expect(
      screen.getByLabelText('I agree to the Privacy & Cookies policy'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
  })

  it('la casilla de consentimiento enlaza a la política (Privacy & Cookies) sin perder lo escrito: pestaña nueva y rel seguro', () => {
    render(<ContactForm />)

    const link = screen.getByRole('link', { name: 'Privacy & Cookies policy' })

    expect(link).toHaveAttribute('href', '/privacy')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('los campos obligatorios llevan el atributo required (arquitectura §14.1)', () => {
    render(<ContactForm />)

    expect(screen.getByLabelText('Name')).toBeRequired()
    expect(screen.getByLabelText('Phone')).toBeRequired()
    expect(screen.getByLabelText('Email')).toBeRequired()
    expect(screen.getByLabelText('Message')).toBeRequired()
    expect(
      screen.getByLabelText('I agree to the Privacy & Cookies policy'),
    ).toBeRequired()
  })

  it('el honeypot existe en el DOM (para que un bot lo rellene) pero no es alcanzable por teclado', () => {
    const { container } = render(<ContactForm />)

    const honeypot = container.querySelector('input[name="website"]')
    expect(honeypot).toBeInTheDocument()
    expect(honeypot).toHaveAttribute('tabIndex', '-1')
    expect(honeypot).toHaveAttribute('autoComplete', 'off')
  })
})
