// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { CaseDetail } from '@/components/detail/CaseDetail'
import { EpisodeDetail } from '@/components/detail/EpisodeDetail'
import { ToolInsightDetail } from '@/components/detail/ToolInsightDetail'
import { ConsentProvider } from '@/modules/consent/client/ConsentProvider'
import type {
  PublicContent,
  PublicEpisode,
} from '@/modules/content/domain/publicContent'

/**
 * WCAG 3.1.2 (idioma de las partes): la página es `en` (la interfaz está en
 * inglés, arquitectura §2.4) y el texto de cada contenido lleva el `lang` de
 * su traducción. Lo que es interfaz no se marca: si se marcara, un lector de
 * pantalla leería «Language» o «Podcast» con la voz del contenido.
 */

function content(overrides: Partial<PublicContent> = {}): PublicContent {
  return {
    id: 'c1',
    type: 'case',
    slug: 'mi-caso',
    defaultLocale: 'es',
    locale: 'es',
    availableLocales: ['es'],
    publishedAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
    title: 'Título del contenido',
    seoTitle: null,
    seoDescription: null,
    summary: 'Resumen del contenido',
    highlight: 'Destacado del contenido',
    body: 'Cuerpo del contenido',
    ...overrides,
  }
}

const EPISODE: PublicEpisode = {
  program: 'brand_the_future',
  provider: 'youtube',
  embedId: 'abc',
  episodeKind: 'podcast',
  language: 'es',
  number: 1,
  episodeDate: null,
  durationSeconds: null,
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
  // @ts-expect-error -- stub mínimo suficiente
  global.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  }
  global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/feed/sessions' && init?.method === 'POST') {
      return { ok: true, json: async () => ({ sessionId: 's' }) } as Response
    }
    return {
      ok: true,
      json: async () => ({
        items: [],
        cursor: 'c',
        round: 0,
        batch: 0,
        hasMore: false,
      }),
    } as Response
  }) as typeof fetch
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('lang en las fichas de detalle', () => {
  it('un caso marca título, destacado y cuerpo con el idioma de su traducción', () => {
    render(
      <CaseDetail
        content={content({ locale: 'ca' })}
        caseDetail={null}
        carousel={[]}
      />,
    )

    for (const text of [
      'Título del contenido',
      'Destacado del contenido',
      'Cuerpo del contenido',
    ]) {
      expect(screen.getByText(text)).toHaveAttribute('lang', 'ca')
    }
  })

  it('el selector de idioma del caso (interfaz) no lleva lang', () => {
    render(
      <CaseDetail
        content={content({ availableLocales: ['es', 'en'] })}
        caseDetail={null}
        carousel={[]}
      />,
    )

    const nav = screen.getByRole('navigation', { name: 'Language' })

    expect(nav).not.toHaveAttribute('lang')
    expect(nav.querySelector('[lang]')).toBeNull()
  })

  it('un episodio marca su texto y deja el tipo («Podcast») sin lang', () => {
    render(
      <ConsentProvider>
        <EpisodeDetail
          content={content({ type: 'episode', locale: 'es' })}
          episode={EPISODE}
        />
      </ConsentProvider>,
    )

    expect(screen.getByText('Título del contenido')).toHaveAttribute(
      'lang',
      'es',
    )
    expect(screen.getByText('Destacado del contenido')).toHaveAttribute(
      'lang',
      'es',
    )
    expect(screen.getByText('Cuerpo del contenido')).toHaveAttribute(
      'lang',
      'es',
    )
    expect(screen.getByText('Podcast')).not.toHaveAttribute('lang')
  })

  it('una tool marca título y resumen; el botón de la ficha no', () => {
    render(
      <ToolInsightDetail
        content={content({ type: 'tool', locale: 'en' })}
        ctaLabel="Use"
        appHref="/tools/mi-caso/app"
      />,
    )

    expect(screen.getByText('Título del contenido')).toHaveAttribute(
      'lang',
      'en',
    )
    expect(screen.getByText('Resumen del contenido')).toHaveAttribute(
      'lang',
      'en',
    )
    expect(screen.getByRole('link', { name: 'Use' })).not.toHaveAttribute(
      'lang',
    )
  })
})

describe('<html lang>', () => {
  it('el documento sigue en inglés: la interfaz lo está y el contenido se marca aparte', () => {
    const layout = readFileSync(
      join(process.cwd(), 'src', 'app', 'layout.tsx'),
      'utf8',
    )

    expect(layout).toMatch(/<html lang="en"/)
  })
})
