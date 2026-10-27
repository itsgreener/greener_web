// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { Honeypot } from '@/components/security/Honeypot'

describe('Honeypot', () => {
  it('es un input de texto fuera del tabulador y sin autocompletado', () => {
    render(<Honeypot name="website" id="website" label="Website" />)

    const input = screen.getByLabelText('Website', { selector: 'input' })
    expect(input).toHaveAttribute('name', 'website')
    expect(input).toHaveAttribute('id', 'website')
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveAttribute('tabindex', '-1')
    expect(input).toHaveAttribute('autocomplete', 'off')
    expect(input).not.toBeRequired()
  })

  it('se oculta con la clase global, no con type=hidden ni display:none', () => {
    const { container } = render(
      <Honeypot name="company" id="x-company" label="Company" />,
    )

    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper).toHaveClass('honeypot')
    expect(wrapper).toHaveAttribute('aria-hidden', 'true')
    expect(wrapper.style.display).toBe('')
    expect(container.querySelector('input[type="hidden"]')).toBeNull()
  })
})
