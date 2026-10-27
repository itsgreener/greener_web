// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { TypeCard } from '@/app/admin/(panel)/contents/new/TypeCard'
import {
  CONTENT_TYPE_CARDS,
  OTHER_KIND_CARDS,
} from '@/app/admin/(panel)/contents/new/newContentOptions'
import { contentTypeSchema } from '@/modules/shared/domain/contentType'
import { otherKindSchema } from '@/modules/content/domain/otherSchema'

describe('TypeCard', () => {
  it('es un radio con su nombre, valor y descripción', () => {
    render(
      <TypeCard
        name="type"
        value="case"
        symbol="C"
        label="Case"
        description="Proyecto"
        selected={false}
        required
        onSelect={() => {}}
      />,
    )

    const radio = screen.getByRole('radio', { name: /Case/ })
    expect(radio).toHaveAttribute('name', 'type')
    expect(radio).toHaveAttribute('value', 'case')
    expect(radio).toBeRequired()
    expect(radio).not.toBeChecked()
    expect(screen.getByText('Proyecto')).toBeInTheDocument()
  })

  it('marcada enseña el check y llama a onSelect al elegirla', () => {
    const onSelect = vi.fn()
    const { rerender } = render(
      <TypeCard
        name="type"
        value="tool"
        symbol="T"
        label="Tool"
        description="Herramienta"
        selected={false}
        onSelect={onSelect}
      />,
    )
    expect(screen.queryByText('✓')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio'))
    expect(onSelect).toHaveBeenCalledTimes(1)

    rerender(
      <TypeCard
        name="type"
        value="tool"
        symbol="T"
        label="Tool"
        description="Herramienta"
        selected
        onSelect={onSelect}
      />,
    )
    expect(screen.getByText('✓')).toBeInTheDocument()
    expect(screen.getByRole('radio')).toBeChecked()
  })
})

describe('opciones de «Nuevo contenido»', () => {
  it('los valores de las tarjetas son exactamente los del dominio', () => {
    expect(CONTENT_TYPE_CARDS.map((c) => c.value).sort()).toEqual(
      [...contentTypeSchema.options].sort(),
    )
    expect(OTHER_KIND_CARDS.map((c) => c.value).sort()).toEqual(
      [...otherKindSchema.options].sort(),
    )
  })
})
