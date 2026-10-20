// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ContactForm } from '@/app/(public)/contact/ContactForm'

vi.mock('@/app/(public)/contact/contactActions', () => ({
  submitContactAction: vi.fn(),
}))

describe('ContactForm — prueba de humo', () => {
  it('pinta los campos: name, phone, email, message y la casilla informativa de la política de privacidad', () => {
    render(<ContactForm />)

    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Phone')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toBeInTheDocument()
    expect(
      screen.getByLabelText('I have read the privacy policy'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
  })

  it('la casilla informativa enlaza a la parte de privacidad de la política sin perder lo escrito: pestaña nueva y rel seguro', () => {
    render(<ContactForm />)

    const link = screen.getByRole('link', { name: 'privacy policy' })

    expect(link).toHaveAttribute('href', '/privacy#privacy')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('la casilla informativa y el botón de enviar comparten fila (el CSS los reparte con space-between)', () => {
    render(<ContactForm />)

    const consent = screen.getByLabelText(
      'I have read the privacy policy',
    )
    const send = screen.getByRole('button', { name: 'Send' })
    const row = send.parentElement as HTMLElement

    expect(row).toContainElement(consent)
    // La fila solo lleva esos dos elementos: el aviso legal y el botón.
    expect(row.children).toHaveLength(2)
    expect(row.parentElement?.tagName).toBe('FORM')
  })

  it('los campos obligatorios llevan el atributo required (arquitectura §14.1)', () => {
    render(<ContactForm />)

    expect(screen.getByLabelText('Name')).toBeRequired()
    expect(screen.getByLabelText('Phone')).toBeRequired()
    expect(screen.getByLabelText('Email')).toBeRequired()
    expect(screen.getByLabelText('Message')).toBeRequired()
  })

  it('la casilla informativa no es obligatoria, empieza sin marcar y no viaja con el formulario', () => {
    render(<ContactForm />)

    const checkbox = screen.getByLabelText('I have read the privacy policy')

    expect(checkbox).not.toBeRequired()
    expect(checkbox).not.toBeChecked()
    expect(checkbox).not.toHaveAttribute('name')
  })

  it('el honeypot existe en el DOM (para que un bot lo rellene) pero no es alcanzable por teclado', () => {
    const { container } = render(<ContactForm />)

    const honeypot = container.querySelector('input[name="website"]')
    expect(honeypot).toBeInTheDocument()
    expect(honeypot).toHaveAttribute('tabIndex', '-1')
    expect(honeypot).toHaveAttribute('autoComplete', 'off')
  })
})
