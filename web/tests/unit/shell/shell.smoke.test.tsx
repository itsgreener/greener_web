// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { Shell } from '@/components/shell/Shell'

describe('Shell — prueba de humo', () => {
  afterEach(cleanup)

  it('pinta el logo, el bloque de navegación y el de redes', () => {
    render(
      <Shell>
        <p>Contenido</p>
      </Shell>,
    )

    expect(screen.getByLabelText('Greener')).toBeInTheDocument()
    expect(screen.getByLabelText('Casos')).toHaveAttribute('href', '/')
    expect(screen.getByLabelText('Channel')).toHaveAttribute('href', '/channel')
    expect(screen.getByLabelText('Insights')).toHaveAttribute(
      'href',
      '/insights',
    )
    expect(screen.getByLabelText('Tools')).toHaveAttribute('href', '/tools')
    expect(screen.getByLabelText('Contacto')).toHaveAttribute(
      'href',
      '/contacto',
    )
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
})
