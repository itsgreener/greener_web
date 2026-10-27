// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { AdminCountedField } from '@/components/admin/AdminCountedField'

describe('AdminCountedField', () => {
  it('arranca con el contador del valor inicial', () => {
    render(
      <AdminCountedField
        id="title"
        name="title"
        label="Título"
        max={10}
        defaultValue="Hola"
      />,
    )

    expect(screen.getByLabelText('Título')).toHaveValue('Hola')
    expect(screen.getByText('4/10')).toBeInTheDocument()
  })

  it('el contador sigue lo que se escribe', () => {
    render(<AdminCountedField id="t" name="t" label="Título" max={10} />)

    expect(screen.getByText('0/10')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Hola mundo' },
    })

    expect(screen.getByText('10/10')).toBeInTheDocument()
  })

  it('es un input de texto por defecto y un textarea con kind="textarea"', () => {
    const { rerender } = render(
      <AdminCountedField id="t" name="t" label="Texto" max={5} />,
    )
    expect(screen.getByLabelText('Texto').tagName).toBe('INPUT')

    rerender(
      <AdminCountedField
        id="t"
        name="t"
        label="Texto"
        max={5}
        kind="textarea"
        rows={4}
      />,
    )
    const area = screen.getByLabelText('Texto')
    expect(area.tagName).toBe('TEXTAREA')
    expect(area).toHaveAttribute('rows', '4')
  })

  it('pasa name, required, ayuda y error al campo', () => {
    render(
      <AdminCountedField
        id="t"
        name="seoTitle"
        label="Título"
        max={5}
        required
        help="Máximo orientativo"
        error="Obligatorio"
      />,
    )

    const control = screen.getByLabelText('Título')
    expect(control).toHaveAttribute('name', 'seoTitle')
    expect(control).toBeRequired()
    expect(screen.getByText('Máximo orientativo')).toBeInTheDocument()
    expect(screen.getByText('Obligatorio')).toBeInTheDocument()
  })
})
