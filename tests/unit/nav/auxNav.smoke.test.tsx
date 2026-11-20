// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { AuxNav } from '@/components/nav/AuxNav'

const mockUsePathname = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

describe('AuxNav — prueba de humo', () => {
  it('pinta los seis destinos en el orden y con los hrefs esperados (captura de referencia del 15 sep)', () => {
    mockUsePathname.mockReturnValue('/')

    render(<AuxNav />)

    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'All',
      'We did it',
      'Podcasts',
      'Insights',
      'Tools',
      'Contact',
    ])

    expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(screen.getByRole('link', { name: 'We did it' })).toHaveAttribute(
      'href',
      '/work',
    )
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      '/contact',
    )
  })

  it('pinta la frase de marca al otro lado del menú, igual que el titular de /contact y sin ser un enlace', () => {
    mockUsePathname.mockReturnValue('/')

    render(<AuxNav />)

    const tagline = screen.getByText('We should have a brand together')
    expect(tagline.tagName).toBe('P')
    expect(tagline).toHaveClass('text-display')
    expect(tagline.closest('a')).toBeNull()
    // Sigue habiendo seis enlaces: la frase no suma ninguno.
    expect(screen.getAllByRole('link')).toHaveLength(6)
  })

  it('marca "All" como página actual cuando el pathname es /', () => {
    mockUsePathname.mockReturnValue('/')

    render(<AuxNav />)

    expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Insights' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('marca "Tools" como página actual en la subhome /tools', () => {
    mockUsePathname.mockReturnValue('/tools')

    render(<AuxNav />)

    expect(screen.getByRole('link', { name: 'Tools' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'All' })).not.toHaveAttribute(
      'aria-current',
    )
  })
})
