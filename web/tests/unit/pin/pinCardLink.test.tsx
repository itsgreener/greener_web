// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'

/**
 * Auditoría 8 oct, P0-8: la tarjeta navegaba con un `<a>` plano y cada clic
 * recargaba el documento (se perdía el estado del feed). Ahora usa `Link`,
 * salvo para los route handlers `/tools|insights/{slug}/app`, que devuelven
 * un documento propio y necesitan carga completa.
 */
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch,
    ...props
  }: {
    href: string
    children: ReactNode
    prefetch?: boolean
  }) => (
    <a
      href={href}
      data-next-link="true"
      data-prefetch={String(prefetch)}
      {...props}
    >
      {children}
    </a>
  ),
}))

import { PinCard, type PinCardData } from '@/components/pin/PinCard'

function pin(destination: string): PinCardData {
  return {
    pinId: 'pin-1',
    destination,
    ratio: '1:1',
    label: 'Rótulo',
    cta: 'Watch',
    alt: 'Alt',
    autoplayMode: null,
    media: [{ kind: 'image', cloudinaryPublicId: 'sample' }],
  }
}

const STYLE = { x: 0, y: 0, width: 200, height: 200 }

describe('PinCard — navegación', () => {
  it('una ficha interna navega con Link y sin precarga', () => {
    render(<PinCard pin={pin('/work/mi-caso')} style={STYLE} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/work/mi-caso')
    expect(link).toHaveAttribute('data-next-link', 'true')
    expect(link).toHaveAttribute('data-prefetch', 'false')
  })

  it('el ?pin= de una tool también va por Link', () => {
    render(<PinCard pin={pin('/tools/mi-tool?pin=pin-1')} style={STYLE} />)

    expect(screen.getByRole('link')).toHaveAttribute('data-next-link', 'true')
  })

  it('el /app de un insight es un <a> normal (route handler, carga completa)', () => {
    render(<PinCard pin={pin('/insights/mi-insight/app')} style={STYLE} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/insights/mi-insight/app')
    expect(link).not.toHaveAttribute('data-next-link')
  })
})
