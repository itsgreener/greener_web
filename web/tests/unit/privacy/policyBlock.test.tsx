// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { PolicyBlock } from '@/app/(public)/privacy/PolicyBlock'

describe('PolicyBlock', () => {
  it('pinta un párrafo y una nota', () => {
    render(
      <>
        <PolicyBlock block={{ type: 'p', text: 'Texto del párrafo' }} />
        <PolicyBlock block={{ type: 'note', text: 'Texto de la nota' }} />
      </>,
    )

    expect(screen.getByText('Texto del párrafo').tagName).toBe('P')
    expect(screen.getByText('Texto de la nota').tagName).toBe('P')
  })

  it('pinta una lista con elementos de texto y con etiqueta en negrita', () => {
    render(
      <PolicyBlock
        block={{
          type: 'list',
          items: ['Uno', { label: 'Dos:', text: 'con etiqueta' }],
        }}
      />,
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Dos:').tagName).toBe('STRONG')
  })

  it('pinta los enlaces externos con noopener', () => {
    render(
      <PolicyBlock
        block={{
          type: 'links',
          items: [{ label: 'AEPD', href: 'https://www.aepd.es' }],
        }}
      />,
    )

    const link = screen.getByRole('link', { name: 'AEPD' })

    expect(link).toHaveAttribute('href', 'https://www.aepd.es')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('pinta una tabla con la primera columna como cabecera de fila', () => {
    render(
      <PolicyBlock
        block={{
          type: 'table',
          head: ['Nombre', 'Finalidad'],
          rows: [['greener_consent', 'Guarda tu elección']],
        }}
      />,
    )

    expect(
      screen.getByRole('columnheader', { name: 'Finalidad' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('rowheader', { name: 'greener_consent' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('cell', { name: 'Guarda tu elección' }),
    ).toBeInTheDocument()
  })
})
