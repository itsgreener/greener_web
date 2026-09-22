// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import PrivacyPage, { metadata } from '@/app/(public)/privacy/page'

describe('/privacy — prueba de humo', () => {
  it('pinta el título y el aviso de placeholder', () => {
    render(<PrivacyPage />)

    expect(
      screen.getByRole('heading', { name: 'Privacy & Cookies' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/placeholder/i)).toBeInTheDocument()
  })

  it('el título de la pestaña es "Privacy & Cookies"', () => {
    expect(metadata.title).toBe('Privacy & Cookies')
  })
})
