// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import ContactPage from '@/app/(public)/contact/page'

describe('/contact — prueba de humo', () => {
  // El título es el del rediseño de contacto («We should have a brand
  // together», con saltos de línea <br />); el <title> de la pestaña sigue
  // siendo «Contact» (metadata de la página). El test buscaba «Contact» en
  // el h1, que dejó de existir con ese rediseño.
  const HEADING = /^We\s+should have\s+a brand\s+together$/

  it('pinta el título del rediseño y el formulario sin reventar', () => {
    render(<ContactPage />)

    expect(screen.getByRole('heading', { name: HEADING })).toBeInTheDocument()
  })

  it('ya no pide la suscripción a la newsletter: el alta es solo desde su pin', () => {
    render(<ContactPage />)

    expect(
      screen.queryByRole('heading', { name: 'Newsletter' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('Email', { selector: '#newsletter-email' }),
    ).toBeNull()
    expect(
      screen.queryByRole('button', { name: /subscribe/i }),
    ).not.toBeInTheDocument()
    // El formulario de contacto sigue ahí, con su único campo Email.
    expect(screen.getAllByLabelText('Email')).toHaveLength(1)
  })

  it('el título usa la tipografía de display (Kinder) vía la clase global', () => {
    render(<ContactPage />)

    expect(screen.getByRole('heading', { name: HEADING })).toHaveClass(
      'text-display',
    )
  })
})
