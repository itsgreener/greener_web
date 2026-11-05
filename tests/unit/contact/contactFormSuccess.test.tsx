// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('@/app/(public)/contact/contactActions', () => ({
  submitContactAction: vi.fn(),
}))

// Estado de éxito directo: lo que se comprueba es el texto, no el envío.
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useActionState: () => [{ success: true }, vi.fn(), false],
}))

import { ContactForm } from '@/app/(public)/contact/ContactForm'

describe('ContactForm — mensaje de éxito', () => {
  it('está en inglés, como el resto de la interfaz (arquitectura §2.4)', () => {
    render(<ContactForm />)

    expect(
      screen.getByText(
        "Thanks for writing to us — we'll get back to you as soon as possible.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Gracias/)).not.toBeInTheDocument()
  })

  it('se anuncia como estado y recibe el foco, porque el formulario desaparece y el foco se perdería', () => {
    render(<ContactForm />)

    const status = screen.getByRole('status')

    expect(status).toHaveTextContent('Thanks for writing to us')
    expect(status).toHaveAttribute('tabindex', '-1')
    expect(status).toHaveFocus()
  })

  it('en éxito ya no se pinta el formulario', () => {
    render(<ContactForm />)

    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull()
  })
})
