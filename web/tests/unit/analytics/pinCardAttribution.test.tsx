// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'

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
    <a href={href} data-prefetch={String(prefetch)} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/modules/analytics/analytics', () => ({
  trackAnalyticsEvent: vi.fn(),
}))

import { PinCard, type PinCardData } from '@/components/pin/PinCard'
import { consumeNavigationSource } from '@/modules/analytics/navigationAttribution'

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

describe('PinCard — atribución de "Case Open"', () => {
  beforeEach(() => {
    consumeNavigationSource()
    window.history.replaceState({}, '', '/')
  })

  it('al hacer clic recuerda la sección para la ficha de destino', () => {
    render(
      <PinCard
        pin={pin('/work/mi-caso')}
        style={STYLE}
        analyticsContext={{ destinationType: 'case', section: 'home' }}
      />,
    )

    fireEvent.click(screen.getByRole('link'))
    window.history.replaceState({}, '', '/work/mi-caso')

    expect(consumeNavigationSource()).toBe('home')
  })

  it('ignora el query del destino (?pin=…) al casar la ruta', () => {
    render(
      <PinCard
        pin={pin('/tools/mi-tool?pin=abc')}
        style={STYLE}
        analyticsContext={{ destinationType: 'tool', section: 'tools' }}
      />,
    )

    fireEvent.click(screen.getByRole('link'))
    window.history.replaceState({}, '', '/tools/mi-tool?pin=abc')

    expect(consumeNavigationSource()).toBe('tools')
  })

  it('sin contexto de analítica no deja ninguna atribución', () => {
    render(<PinCard pin={pin('/work/mi-caso')} style={STYLE} />)

    fireEvent.click(screen.getByRole('link'))
    window.history.replaceState({}, '', '/work/mi-caso')

    expect(consumeNavigationSource()).toBe('direct')
  })
})
