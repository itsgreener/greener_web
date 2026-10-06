// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('@/modules/analytics/analytics', () => ({
  trackAnalyticsEvent: vi.fn(),
}))

import { EpisodeDetail } from '@/app/(public)/work/[slug]/EpisodeDetail'
import type { PublicContent } from '@/modules/content/infrastructure/publicContentSource'
import type { PublicEpisode } from '@/modules/content/infrastructure/publicEpisodeSource'

/**
 * Ficha de episodio según el documento de diseño (5 oct 2026): dos grupos
 * de texto, título en Kinder, tipo de episodio y highlight en negrita,
 * título grande y segundo CTA «Watch more» a la plataforma.
 */

function content(overrides: Partial<PublicContent> = {}): PublicContent {
  return {
    id: 'content-1',
    type: 'episode',
    slug: 'mi-episodio',
    defaultLocale: 'es',
    locale: 'es',
    availableLocales: ['es'],
    title: 'Brand the future',
    seoTitle: null,
    seoDescription: null,
    summary: null,
    highlight: 'Un highlight destacado',
    body: 'El cuerpo del episodio.',
    coverMedia: null,
    coverRatio: null,
    ...overrides,
  }
}

function episode(
  provider: PublicEpisode['provider'] = 'youtube',
  embedId = 'abc123',
): PublicEpisode {
  return {
    program: 'brand_the_future',
    provider,
    embedId,
    episodeKind: 'podcast',
  }
}

function css(): string {
  // Normalizado a LF (el repo puede venir con CRLF) y sin comentarios: un
  // comentario con llaves rompería la búsqueda de la regla.
  return readFileSync(
    join(
      process.cwd(),
      'src/app/(public)/work/[slug]/EpisodeDetail.module.css',
    ),
    'utf8',
  )
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

// Cuerpo de la regla `.selector { … }` de un fichero CSS.
function rule(source: string, selector: string): string {
  const escaped = selector.replaceAll('.', '\\.')
  const match = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))

  expect(match, `no existe la regla ${selector}`).not.toBeNull()

  return match![1]
}

beforeEach(() => {
  global.ResizeObserver = class {
    callback: ResizeObserverCallback
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
    }
    observe() {
      this.callback(
        [{ contentRect: { width: 1200 } } as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      )
    }
    disconnect() {}
    unobserve() {}
  }
  // @ts-expect-error -- stub mínimo
  global.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  }
  global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/feed/sessions' && init?.method === 'POST') {
      return { ok: true, json: async () => ({ sessionId: 's1' }) } as Response
    }

    return {
      ok: true,
      json: async () => ({ items: [], cursor: 'c', round: 0, hasMore: false }),
    } as Response
  }) as typeof fetch
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('EpisodeDetail — segundo CTA «Watch more»', () => {
  it.each([
    ['youtube', 'abc123', 'https://www.youtube.com/watch?v=abc123', 'YouTube'],
    ['vimeo', '987654', 'https://vimeo.com/987654', 'Vimeo'],
    ['spotify', 'ep456', 'https://open.spotify.com/episode/ep456', 'Spotify'],
  ] as const)(
    '%s: enlaza al episodio en su plataforma, en pestaña nueva y de forma segura',
    (provider, id, href, label) => {
      render(
        <EpisodeDetail content={content()} episode={episode(provider, id)} />,
      )

      const cta = screen.getByRole('link', {
        name: new RegExp(`Watch more on ${label}`),
      })

      expect(cta).toHaveAttribute('href', href)
      expect(cta).toHaveAttribute('target', '_blank')
      expect(cta).toHaveAttribute('rel', 'noopener noreferrer')
      expect(cta).toHaveTextContent('Watch more')
    },
  )

  it('el nombre accesible contiene el texto visible y avisa de que abre pestaña nueva', () => {
    render(
      <EpisodeDetail content={content()} episode={episode('vimeo', '1')} />,
    )

    expect(
      screen.getByRole('link', {
        name: 'Watch more on Vimeo (opens in a new tab)',
      }),
    ).toBeInTheDocument()
  })

  it('el CTA es un enlace: no carga ningún iframe de terceros (el embed sigue pidiendo consentimiento)', () => {
    const { container } = render(
      <EpisodeDetail content={content()} episode={episode()} />,
    )

    expect(container.querySelector('iframe')).toBeNull()
  })

  it('es el último elemento de la columna de texto (abajo a la derecha)', () => {
    const { container } = render(
      <EpisodeDetail content={content()} episode={episode()} />,
    )

    const text = container.querySelector('[class*="text"]')!
    const cta = screen.getByRole('link', { name: /Watch more/ })

    expect(text.lastElementChild).toBe(cta)
  })

  it('se muestra aunque el episodio no tenga highlight ni cuerpo', () => {
    render(
      <EpisodeDetail
        content={content({ highlight: null, body: null })}
        episode={episode()}
      />,
    )

    expect(screen.getByRole('link', { name: /Watch more/ })).toBeInTheDocument()
  })
})

describe('EpisodeDetail — grupos de texto y tipografía', () => {
  it('dos grupos: tipo + título arriba; highlight + cuerpo debajo', () => {
    const { container } = render(
      <EpisodeDetail content={content()} episode={episode()} />,
    )

    const heading = container.querySelector('[class*="heading"]')!
    const details = container.querySelector('[class*="details"]')!

    expect(heading).not.toBe(details)
    expect(heading.parentElement).toBe(details.parentElement)
    expect(
      heading.compareDocumentPosition(details) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    expect(heading).toContainElement(screen.getByText('Podcast'))
    expect(heading).toContainElement(
      screen.getByRole('heading', { name: 'Brand the future' }),
    )
    expect(details).toContainElement(screen.getByText('Un highlight destacado'))
    expect(details).toContainElement(
      screen.getByText('El cuerpo del episodio.'),
    )
  })

  it('sin highlight ni cuerpo no se pinta el segundo grupo (no deja un hueco vacío)', () => {
    const { container } = render(
      <EpisodeDetail
        content={content({ highlight: null, body: null })}
        episode={episode()}
      />,
    )

    expect(container.querySelector('[class*="details"]')).toBeNull()
  })

  it('el título usa Kinder (clase global text-display), igual que en caso', () => {
    render(<EpisodeDetail content={content()} episode={episode()} />)

    expect(
      screen.getByRole('heading', { name: 'Brand the future' }),
    ).toHaveClass('text-display')
  })

  it('tipo de episodio y highlight en negrita real (700)', () => {
    const source = css()

    expect(rule(source, '.kind')).toMatch(/font-weight:\s*700/)
    expect(rule(source, '.highlight')).toMatch(/font-weight:\s*700/)
  })

  it('el título NO pide negrita: Kinder solo existe en 400 y no se fabrica una falsa', () => {
    expect(rule(css(), '.title')).not.toMatch(/font-weight:\s*(bold|[5-9]00)/)
  })

  it('el título es grande y se dimensiona con el ancho de su columna (cqw), con respaldo', () => {
    const title = rule(css(), '.title')

    // Respaldo para navegadores sin container query units…
    expect(title).toMatch(/font-size:\s*2rem;[\s\S]*font-size:\s*clamp\(/)
    // …y el mínimo del clamp no baja de 2rem, el máximo llega a 3,75rem.
    expect(title).toMatch(/clamp\(2rem,\s*16cqw,\s*3\.75rem\)/)
    expect(rule(css(), '.text')).toMatch(/container-type:\s*inline-size/)
  })

  it('el hueco entre grupos es mayor que el de dentro de cada grupo', () => {
    const source = css()
    const text = rule(source, '.text')

    // Dentro de un grupo: 16 px (--space-md); entre grupos: 8 + 24 = 32 px
    // (ajuste de diseño de Greener, 6 oct 2026; antes 4 y 12 px).
    expect(text).toMatch(/--episode-gap-inner:\s*var\(--space-md\)/)
    expect(text).toMatch(
      /--episode-gap-groups:\s*calc\(var\(--space-sm\)\s*\+\s*var\(--space-lg\)\)/,
    )
    expect(text).toMatch(/gap:\s*var\(--episode-gap-groups\)/)
    expect(rule(source, '.heading,\n.details')).toMatch(
      /gap:\s*var\(--episode-gap-inner\)/,
    )
  })

  it('la columna de texto mide lo mismo que el embed (stretch), para que el CTA quede abajo', () => {
    expect(rule(css(), '.contentBlock')).toMatch(/align-items:\s*stretch/)
    expect(rule(css(), '.cta')).toMatch(/margin-top:\s*auto/)
    expect(rule(css(), '.cta')).toMatch(/margin-left:\s*auto/)
  })
})
