// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { Shell } from '@/components/shell/Shell'

describe('Shell — prueba de humo', () => {
  it('pinta el logo, el bloque de navegación y el de redes', () => {
    render(
      <Shell>
        <p>Contenido</p>
      </Shell>,
    )

    expect(screen.getByLabelText('Greener')).toBeInTheDocument()
    expect(screen.getByLabelText('We did it')).toHaveAttribute('href', '/')
    expect(screen.getByLabelText('Podcasts')).toHaveAttribute(
      'href',
      '/channel',
    )
    expect(screen.getByLabelText('Insights')).toHaveAttribute(
      'href',
      '/insights',
    )
    expect(screen.getByLabelText('Tools')).toHaveAttribute('href', '/tools')
    expect(screen.getByLabelText('Contact')).toHaveAttribute('href', '/contact')
    expect(screen.getByText('Contenido')).toBeInTheDocument()
  })

  it('no muestra Shop — fuera de alcance de V1 (arquitectura §2.2, §2.3)', () => {
    render(
      <Shell>
        <p>Contenido</p>
      </Shell>,
    )

    expect(screen.queryByLabelText('Shop')).not.toBeInTheDocument()
  })

  it('los enlaces de redes se abren en una pestaña nueva y con rel seguro', () => {
    render(
      <Shell>
        <p>Contenido</p>
      </Shell>,
    )

    for (const label of ['Instagram', 'YouTube', 'LinkedIn']) {
      const link = screen.getByLabelText(label)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    }
  })

  it('cada icono lleva su pastilla con el nombre (ej. "LinkedIn") y la máscara del SVG correspondiente — confirmado por diseño el 15 sep', () => {
    render(
      <Shell>
        <p>Contenido</p>
      </Shell>,
    )

    const linkedin = screen.getByLabelText('LinkedIn')
    expect(linkedin).toHaveTextContent('LinkedIn')

    const icon = linkedin.querySelector('span')
    expect(icon?.style.getPropertyValue('--icon-url')).toBe(
      'url(/icons/linkedin.svg)',
    )
  })
})
