// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import ContactoPage from '@/app/(public)/contacto/page'

describe('/contacto — prueba de humo', () => {
  afterEach(cleanup)

  it('pinta el placeholder sin reventar', () => {
    render(<ContactoPage />)

    expect(
      screen.getByRole('heading', { name: 'Contacto' }),
    ).toBeInTheDocument()
  })
})
