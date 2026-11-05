// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { BrokenHeadline } from '@/components/text/BrokenHeadline'

describe('BrokenHeadline', () => {
  it('es un h2 por defecto y un h1 con as="h1"', () => {
    const { rerender } = render(<BrokenHeadline lines={['a', 'b']} />)
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()

    rerender(<BrokenHeadline lines={['a', 'b']} as="h1" />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('pone un <br /> entre líneas y ninguno tras la última', () => {
    const { container } = render(
      <BrokenHeadline lines={['We', 'should have', 'a brand', 'together']} />,
    )

    expect(container.querySelectorAll('br')).toHaveLength(3)
    expect(container.firstElementChild?.lastChild?.nodeName).not.toBe('BR')
  })

  it('el texto accesible separa las líneas con un espacio', () => {
    render(<BrokenHeadline lines={['Like what', 'you see?', 'More']} />)

    expect(screen.getByRole('heading').textContent).toBe(
      'Like what you see? More',
    )
  })

  it('una sola línea no lleva salto ni espacio sobrante', () => {
    const { container } = render(<BrokenHeadline lines={['Solo']} />)

    expect(container.querySelector('br')).toBeNull()
    expect(screen.getByRole('heading').textContent).toBe('Solo')
  })

  it('pasa la clase al titular', () => {
    render(<BrokenHeadline lines={['a']} className="titular" />)

    expect(screen.getByRole('heading')).toHaveClass('titular')
  })
})
