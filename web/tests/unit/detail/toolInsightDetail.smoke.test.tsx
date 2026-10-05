// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ToolInsightDetail } from '@/components/detail/ToolInsightDetail'
import type { PublicContent } from '@/modules/content/infrastructure/publicContentSource'
import type { FeedBatchResult } from '@/modules/feed/application/getFeedSessionBatch'

const BASE_CONTENT: PublicContent = {
  id: 'content-1',
  type: 'tool',
  slug: 'mi-tool',
  defaultLocale: 'es',
  locale: 'es',
  availableLocales: ['es'],
  title: 'Mi tool',
  seoTitle: null,
  seoDescription: null,
  summary: 'Resumen de la tool',
  highlight: null,
  body: null,
  coverMedia: null,
  coverRatio: null,
}

function fakeBatch(count: number, hasMore: boolean): FeedBatchResult {
  return {
    items: Array.from({ length: count }, (_, i) => ({
      pinId: `rec-pin-${i}`,
      contentId: `rec-content-${i}`,
      kind: 'case',
      destination: `/work/rec-${i}`,
      ratio: '1:1',
      label: `Recomendación ${i}`,
      cta: 'Watch',
      alt: `Alt ${i}`,
      autoplayMode: null,
      media: [{ kind: 'image' as const, cloudinaryPublicId: 'sample' }],
    })),
    cursor: 'cursor-1',
    round: 0,
    hasMore,
  }
}

describe('ToolInsightDetail — prueba de humo', () => {
  beforeEach(() => {
    // Mismo stub que Feed.smoke.test.tsx: ResizeObserver no existe en
    // jsdom, y sin un ancho real containerWidth se queda en 0 para siempre.
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
    // @ts-expect-error -- stub mínimo suficiente para el smoke test
    global.IntersectionObserver = class {
      observe() {}
      disconnect() {}
    }

    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/feed/sessions' && init?.method === 'POST') {
        const body = JSON.parse(init.body as string) as {
          scope: string
          excludeContentId?: string
        }
        return {
          ok: true,
          json: async () => ({
            sessionId: `session-${body.excludeContentId ?? 'none'}`,
          }),
        } as Response
      }
      if (url.startsWith('/api/feed/session-')) {
        return {
          ok: true,
          json: async () => fakeBatch(6, false),
        } as Response
      }
      throw new Error(`URL inesperada en el test: ${url}`)
    }) as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('pinta título, summary y el CTA "Use" apuntando a /app, y abre la sesión de recomendaciones excluyéndose a sí mismo', async () => {
    render(
      <ToolInsightDetail
        content={BASE_CONTENT}
        ctaLabel="Use"
        appHref="/tools/mi-tool/app"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Mi tool' })).toBeInTheDocument()
    expect(screen.getByText('Resumen de la tool')).toBeInTheDocument()

    const cta = screen.getByRole('link', { name: 'Use' })
    expect(cta).toHaveAttribute('href', '/tools/mi-tool/app')

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/feed/sessions',
      expect.objectContaining({
        method: 'POST',
        // Una tool recomienda solo tools (scope por sección, 5 oct 2026).
        body: JSON.stringify({
          scope: 'tools',
          excludeContentId: 'content-1',
        }),
      }),
    )
  })

  it.each([
    ['insight', 'insights'],
    ['other', 'home'],
  ] as const)(
    'el scope de las recomendaciones sigue a la sección: %s → %s',
    async (type, scope) => {
      render(<ToolInsightDetail content={{ ...BASE_CONTENT, type }} />)

      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/feed/sessions',
          expect.objectContaining({
            body: JSON.stringify({ scope, excludeContentId: 'content-1' }),
          }),
        ),
      )
    },
  )

  it('el texto queda limitado a una columna: recibe --text-column-width con el ancho de una columna de la retícula', async () => {
    // Contenedor simulado de 1200 px → 6 columnas, hueco de 12 px:
    // (1200 − 5 × 12) / 6 = 190 px por columna.
    render(<ToolInsightDetail content={BASE_CONTENT} />)

    const text = screen.getByRole('heading', { name: 'Mi tool' }).parentElement
    await waitFor(() =>
      expect(text?.style.getPropertyValue('--text-column-width')).toBe('190px'),
    )
  })

  it('con un insight, el CTA es "Read" en vez de "Use"', async () => {
    render(
      <ToolInsightDetail
        content={{ ...BASE_CONTENT, type: 'insight' }}
        ctaLabel="Read"
        appHref="/insights/mi-tool/app"
      />,
    )

    expect(screen.getByRole('link', { name: 'Read' })).toHaveAttribute(
      'href',
      '/insights/mi-tool/app',
    )
  })

  it('sin cover_media_id (todavía no se ha subido portada), no revienta y omite la imagen', () => {
    const { container } = render(
      <ToolInsightDetail
        content={BASE_CONTENT}
        ctaLabel="Use"
        appHref="/tools/mi-tool/app"
      />,
    )

    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('con cover_media_id de imagen, la pinta', () => {
    render(
      <ToolInsightDetail
        content={{
          ...BASE_CONTENT,
          coverMedia: { kind: 'image', cloudinaryPublicId: 'cover1' },
          coverRatio: '16:9',
        }}
        ctaLabel="Use"
        appHref="/tools/mi-tool/app"
      />,
    )

    expect(screen.getByAltText('Mi tool')).toBeInTheDocument()
  })

  it('sin summary, no revienta y simplemente lo omite', () => {
    render(
      <ToolInsightDetail
        content={{ ...BASE_CONTENT, summary: null }}
        ctaLabel="Use"
        appHref="/tools/mi-tool/app"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Mi tool' })).toBeInTheDocument()
  })

  it('sin ctaLabel/appHref (contenido libre, /variety/[slug]), no pinta ningún CTA', () => {
    render(<ToolInsightDetail content={BASE_CONTENT} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('con cover_media_id de vídeo (contenido libre admite vídeo, especificacion-final-formato-detalle.md §3), lo pinta como <video>', () => {
    const { container } = render(
      <ToolInsightDetail
        content={{
          ...BASE_CONTENT,
          coverMedia: { kind: 'video', cloudinaryPublicId: 'cover-video' },
          coverRatio: '16:9',
        }}
      />,
    )

    const video = container.querySelector('video')
    expect(video).toBeInTheDocument()
    expect(video).toHaveAttribute('aria-label', 'Mi tool')
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('carga y pinta las recomendaciones del panel (excluido el propio contenido del universo)', async () => {
    render(
      <ToolInsightDetail
        content={BASE_CONTENT}
        ctaLabel="Use"
        appHref="/tools/mi-tool/app"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Recomendación 0')).toBeInTheDocument()
    })

    expect(screen.getAllByText(/^Recomendación/)).toHaveLength(6)
  })

  it('sin ratio de portada (contenido sin portada todavía), usa un ratio de reserva en vez de romper', async () => {
    render(
      <ToolInsightDetail
        content={BASE_CONTENT}
        ctaLabel="Use"
        appHref="/tools/mi-tool/app"
      />,
    )

    // No revienta al montar ni al calcular el layout — sigue mostrando
    // el título y, con el tiempo, las recomendaciones.
    expect(screen.getByRole('heading', { name: 'Mi tool' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByText(/^Recomendación/).length).toBeGreaterThan(0)
    })
  })
})
