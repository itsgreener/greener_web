// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import ContactPage from '@/app/(public)/contact/page'

describe('/contact — prueba de humo', () => {
  it('pinta el placeholder sin reventar', () => {
    render(<ContactPage />)

    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument()
  })

  it('el título usa la tipografía de display (Kinder) vía la clase global', () => {
    render(<ContactPage />)

    expect(screen.getByRole('heading', { name: 'Contact' })).toHaveClass(
      'text-display',
    )
  })
})
