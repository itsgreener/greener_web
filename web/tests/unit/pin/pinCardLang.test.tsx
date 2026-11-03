// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { PinCard, type PinCardData } from '@/components/pin/PinCard'

/**
 * `lang` del texto de la tarjeta del feed (WCAG 3.1.2). El título lleva el
 * idioma REAL de la traducción que se muestra (puede no ser el del pin si
 * falta la traducción) y la interfaz («Watch», «Insights by Greener») no se
 * marca.
 */

const STYLE = { x: 0, y: 0, width: 200, height: 200 }

function pin(overrides: Partial<PinCardData> = {}): PinCardData {
  return {
    pinId: 'p1',
    destination: '/work/mi-caso',
    ratio: '1:1',
    label: null,
    displayTitle: 'Un título',
    displaySecondary: 'Cliente',
    cta: 'Watch',
    alt: 'Alt',
    autoplayMode: null,
    media: [{ kind: 'image', cloudinaryPublicId: 'sample' }],
    ...overrides,
  }
}

describe('PinCard — lang', () => {
  it('el título lleva el idioma de su traducción; el cliente y el CTA no llevan lang', () => {
    render(
      <PinCard
        pin={pin({ languages: { title: 'ca', secondary: null, cta: null } })}
        style={STYLE}
      />,
    )

    expect(screen.getByText('Un título')).toHaveAttribute('lang', 'ca')
    expect(screen.getByText('Cliente')).not.toHaveAttribute('lang')
    expect(screen.getByText('Watch')).not.toHaveAttribute('lang')
  })

  it('en una tool, la descripción y el nombre llevan cada uno su idioma', () => {
    render(
      <PinCard
        pin={pin({
          displayTitle: 'Descripción',
          displaySecondary: 'Nombre',
          languages: { title: 'es', secondary: 'en', cta: null },
        })}
        style={STYLE}
      />,
    )

    expect(screen.getByText('Descripción')).toHaveAttribute('lang', 'es')
    expect(screen.getByText('Nombre')).toHaveAttribute('lang', 'en')
  })

  it('un pin de página satélite marca el gancho y el CTA con el idioma del pin', () => {
    render(
      <PinCard
        pin={pin({
          displayTitle: null,
          displaySecondary: null,
          label: 'Gancho',
          cta: 'Sube tu portfolio',
          languages: { title: 'es', secondary: null, cta: 'es' },
        })}
        style={STYLE}
      />,
    )

    expect(screen.getByText('Gancho')).toHaveAttribute('lang', 'es')
    expect(screen.getByText('Sube tu portfolio')).toHaveAttribute('lang', 'es')
  })

  it('sin información de idioma no se pone ningún lang', () => {
    const { container } = render(<PinCard pin={pin()} style={STYLE} />)

    expect(container.querySelector('[lang]')).toBeNull()
  })
})
