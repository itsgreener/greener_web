// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { PublicField } from '@/components/form/PublicField'

describe('PublicField', () => {
  it('input de texto por defecto, con label enlazado y name como id', () => {
    render(<PublicField name="name" label="Name" />)

    const input = screen.getByLabelText('Name')
    expect(input.tagName).toBe('INPUT')
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveAttribute('id', 'name')
    expect(input).toHaveAttribute('name', 'name')
    expect(input).not.toBeRequired()
  })

  it('respeta type, required e id propio', () => {
    render(
      <PublicField
        name="email"
        id="contact-email"
        label="Email"
        type="email"
        required
      />,
    )

    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('id', 'contact-email')
    expect(input).toHaveAttribute('name', 'email')
    expect(input).toBeRequired()
  })

  it('con rows es un textarea', () => {
    render(<PublicField name="message" label="Message" rows={6} required />)

    const area = screen.getByLabelText('Message')
    expect(area.tagName).toBe('TEXTAREA')
    expect(area).toHaveAttribute('rows', '6')
    expect(area).toBeRequired()
  })

  it('sin error no pinta alerta ni atributos aria de error', () => {
    render(<PublicField name="name" label="Name" />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    const input = screen.getByLabelText('Name')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('aria-describedby')
  })

  it('con error: alerta asociada al control y marcado como inválido', () => {
    render(
      <PublicField name="phone" label="Phone" error="Teléfono no válido" />,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Teléfono no válido')

    const input = screen.getByLabelText('Phone')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', alert.id)
  })

  it('el error de un textarea también se asocia', () => {
    render(
      <PublicField name="message" label="Message" rows={3} error="Corto" />,
    )

    const area = screen.getByLabelText('Message')
    expect(area).toHaveAttribute('aria-describedby', 'message-error')
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'message-error')
  })
})
