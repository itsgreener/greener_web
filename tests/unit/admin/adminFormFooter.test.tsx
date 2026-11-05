// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { AdminFormFooter } from '@/components/admin/AdminForm'

describe('AdminFormFooter', () => {
  it('en reposo pinta el botón con su texto y sin mensajes', () => {
    render(<AdminFormFooter state={{}} pending={false} label="Guardar" />)

    const button = screen.getByRole('button', { name: 'Guardar' })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toBeEnabled()
    expect(screen.queryByText('Guardado')).not.toBeInTheDocument()
  })

  it('mientras guarda: «Guardando…» y botón desactivado', () => {
    render(<AdminFormFooter state={{}} pending label="Guardar" />)

    const button = screen.getByRole('button', { name: 'Guardando…' })
    expect(button).toBeDisabled()
    expect(screen.queryByText('Guardar')).not.toBeInTheDocument()
  })

  it('muestra el error del formulario', () => {
    render(
      <AdminFormFooter
        state={{ formError: 'No se ha podido guardar.' }}
        pending={false}
        label="Guardar"
      />,
    )

    expect(screen.getByText('No se ha podido guardar.')).toBeInTheDocument()
  })

  it('anuncia el éxito solo si hay mensaje de éxito', () => {
    const { rerender } = render(
      <AdminFormFooter
        state={{ success: true }}
        pending={false}
        label="Guardar"
      />,
    )
    expect(screen.queryByText('Datos guardados.')).not.toBeInTheDocument()

    rerender(
      <AdminFormFooter
        state={{ success: true }}
        pending={false}
        label="Guardar"
        successMessage="Datos guardados."
      />,
    )
    expect(screen.getByText('Datos guardados.')).toBeInTheDocument()
  })

  it('con mensaje de éxito pero sin éxito en el estado, no lo muestra', () => {
    render(
      <AdminFormFooter
        state={{}}
        pending={false}
        label="Guardar"
        successMessage="Datos guardados."
      />,
    )

    expect(screen.queryByText('Datos guardados.')).not.toBeInTheDocument()
  })
})
