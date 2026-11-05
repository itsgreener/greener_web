// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { CtaAnchor, CtaButton, CtaLabel, CtaLink } from '@/components/cta/Cta'

const css = readFileSync(
  join(process.cwd(), 'src/components/cta/Cta/Cta.module.css'),
  'utf8',
)

describe('Cta', () => {
  it('CtaButton se desactiva y se marca como ocupado mientras procesa', () => {
    const { rerender } = render(<CtaButton type="submit">Send</CtaButton>)
    const button = screen.getByRole('button', { name: 'Send' })

    expect(button).toBeEnabled()
    expect(button).not.toHaveAttribute('aria-busy')

    rerender(
      <CtaButton type="submit" pending>
        Sending…
      </CtaButton>,
    )

    const busy = screen.getByRole('button', { name: 'Sending…' })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
  })

  it('CtaButton respeta un disabled explícito aunque no esté procesando', () => {
    render(<CtaButton disabled>Send</CtaButton>)

    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('CtaLink pinta un enlace con la clase base, la de posición y la marca de espera', () => {
    render(
      <CtaLink href="/tool" className="posicion">
        Use
      </CtaLink>,
    )
    const link = screen.getByRole('link', { name: 'Use' })
    const mark = link.querySelector('[data-cta-pending]')

    expect(link).toHaveAttribute('href', '/tool')
    expect(link.className).toContain('posicion')
    expect(link.className.split(' ')).toHaveLength(2)
    expect(mark).not.toBeNull()
    expect(mark).toHaveAttribute('data-cta-pending', 'false')
  })

  it('CtaAnchor conserva los atributos del enlace externo', () => {
    render(
      <CtaAnchor href="https://example.com" target="_blank" rel="noopener">
        Watch more
      </CtaAnchor>,
    )
    const link = screen.getByRole('link', { name: 'Watch more' })

    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener')
  })

  it('CtaLabel no es interactiva', () => {
    render(<CtaLabel>Upload your CV</CtaLabel>)

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Upload your CV').tagName).toBe('SPAN')
  })

  it('el CSS cubre los dos estados de espera: disabled y enlace navegando', () => {
    expect(css).toContain('&:disabled')
    expect(css).toContain("[data-cta-pending='true']")
    expect(css).toMatch(/pointer-events:\s*none/)
  })
})
