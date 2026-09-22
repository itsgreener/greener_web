// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { CaseDetail } from '@/app/(public)/work/[slug]/CaseDetail'
import type { PublicContent } from '@/modules/content/infrastructure/publicContentSource'
import type { FeedBatchResult } from '@/modules/feed/application/getFeedSessionBatch'

const CONTENT: PublicContent = {
  id: 'content-1',
  type: 'case',
  slug: 'mi-caso',
  defaultLocale: 'es',
  locale: 'es',
  availableLocales: ['es'],
  title: 'Mi caso',
  seoTitle: null,
  seoDescription: null,
  summary: null,
  highlight: 'Un subtítulo destacado',
  body: 'El cuerpo del caso.',
  coverMedia: null,
  coverRatio: null,
}

function fakeBatch(count: number, hasMore: boolean): FeedBatchResult {
  return {
    items: Array.from({ length: count }, (_, i) => ({
      pinId: `rec-pin-${i}`,
      contentId: `rec-content-${i}`,
      kind: 'tool',
      destination: `/tools/rec-${i}`,
      ratio: '1:1',
      label: `Recomendación ${i}`,
      cta: 'Use',
      alt: `Alt ${i}`,
      autoplayMode: null,
      media: [{ kind: 'image' as const, cloudinaryPublicId: 'sample' }],
    })),
    cursor: 'cursor-1',
    hasMore,
  }
}

describe('CaseDetail — prueba de humo', () => {
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
    // @ts-expect-error -- stub mínimo suficiente para el smoke test
    global.IntersectionObserver = class {
      observe() {}
      disconnect() {}
    }

    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/feed/sessions' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({ sessionId: 'session-case' }),
        } as Response
      }
      if (url.startsWith('/api/feed/session-case')) {
        return { ok: true, json: async () => fakeBatch(4, false) } as Response
      }
      throw new Error(`URL inesperada en el test: ${url}`)
    }) as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('pinta título, highlight, body y cliente, y abre la sesión de recomendaciones excluyéndose a sí mismo', async () => {
    render(<CaseDetail content={CONTENT} caseDetail={{ client: 'Agróptimum' }} carousel={[]} />)

    expect(screen.getByRole('heading', { name: 'Mi caso' })).toBeInTheDocument()
    expect(screen.getByText('Un subtítulo destacado')).toBeInTheDocument()
    expect(screen.getByText('El cuerpo del caso.')).toBeInTheDocument()
    expect(screen.getByText('Agróptimum')).toBeInTheDocument()

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/feed/sessions',
      expect.objectContaining({
        body: JSON.stringify({ scope: 'home', excludeContentId: 'content-1' }),
      }),
    )
  })

  it('sin case_detail (dato ausente), no revienta y simplemente omite el cliente', () => {
    render(<CaseDetail content={CONTENT} caseDetail={null} carousel={[]} />)

    expect(screen.getByRole('heading', { name: 'Mi caso' })).toBeInTheDocument()
    expect(screen.queryByText('Agróptimum')).not.toBeInTheDocument()
  })

  it('el carrusel mezcla imagen y vídeo — usa el alt real de cada elemento, no uno calculado (hueco de accesibilidad cerrado el 14 sep)', () => {
    const { container } = render(
      <CaseDetail
        content={CONTENT}
        caseDetail={null}
        carousel={[
          {
            mediaId: 'm1',
            kind: 'image',
            cloudinaryPublicId: 'img1',
            sortOrder: 0,
            alt: 'Equipo trabajando en el campo',
            width: 1600,
            height: 900,
          },
          {
            mediaId: 'm2',
            kind: 'video',
            cloudinaryPublicId: 'vid1',
            sortOrder: 1,
            alt: 'Vídeo de la cosecha',
            width: 1920,
            height: 1080,
          },
        ]}
      />,
    )

    const img = screen.getByAltText('Equipo trabajando en el campo')
    expect(img.tagName).toBe('IMG')

    const video = container.querySelector('video')
    expect(video).toBeInTheDocument()
    expect(video).toHaveAttribute('controls')
    expect(video).toHaveAttribute('aria-label', 'Vídeo de la cosecha')
    expect(video?.getAttribute('poster')).toContain('vid1')
  })

  it('el ratio fijo del carrusel es el del medio más ancho, aplicado por igual a todas las diapositivas (decisión del 21 sep)', () => {
    const { container } = render(
      <CaseDetail
        content={CONTENT}
        caseDetail={null}
        carousel={[
          {
            mediaId: 'm1',
            kind: 'image',
            cloudinaryPublicId: 'vertical',
            sortOrder: 0,
            alt: 'Vertical',
            width: 900,
            height: 1600, // 9:16
          },
          {
            mediaId: 'm2',
            kind: 'image',
            cloudinaryPublicId: 'panoramica',
            sortOrder: 1,
            alt: 'Panorámica',
            width: 1600,
            height: 900, // 16:9 — la más ancha, gana
          },
        ]}
      />,
    )

    const slides = container.querySelectorAll('[class*="slide"]')
    expect(slides.length).toBe(2)
    for (const slide of slides) {
      expect((slide as HTMLElement).style.aspectRatio).toBe('16 / 9')
    }
  })

  it('con un único medio, el carrusel no revienta calculando el ratio', () => {
    const { container } = render(
      <CaseDetail
        content={CONTENT}
        caseDetail={null}
        carousel={[
          {
            mediaId: 'm1',
            kind: 'image',
            cloudinaryPublicId: 'unico',
            sortOrder: 0,
            alt: 'Único',
            width: 1000,
            height: 1000,
          },
        ]}
      />,
    )

    const slide = container.querySelector('[class*="slide"]') as HTMLElement
    expect(slide.style.aspectRatio).toBe('1 / 1')
  })

  it('con una sola traducción disponible, no pinta el selector de idioma', () => {
    render(<CaseDetail content={CONTENT} caseDetail={null} carousel={[]} />)

    expect(
      screen.queryByRole('navigation', { name: 'Idioma' }),
    ).not.toBeInTheDocument()
  })

  it('con varias traducciones, pinta el selector — el default va a /work/{slug}, el resto a /work/{slug}/{locale} (arquitectura §7.7)', () => {
    render(
      <CaseDetail
        content={{ ...CONTENT, availableLocales: ['es', 'en'] }}
        caseDetail={null}
        carousel={[]}
      />,
    )

    const nav = screen.getByRole('navigation', { name: 'Idioma' })
    expect(nav).toBeInTheDocument()

    const esLink = screen.getByRole('link', { name: 'ES' })
    const enLink = screen.getByRole('link', { name: 'EN' })
    expect(esLink).toHaveAttribute('href', '/work/mi-caso')
    expect(enLink).toHaveAttribute('href', '/work/mi-caso/en')
  })

  it('marca como página actual el locale que se está viendo, no el default', () => {
    render(
      <CaseDetail
        content={{
          ...CONTENT,
          availableLocales: ['es', 'en'],
          locale: 'en',
        }}
        caseDetail={null}
        carousel={[]}
      />,
    )

    expect(screen.getByRole('link', { name: 'EN' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      screen.getByRole('link', { name: 'ES' }),
    ).not.toHaveAttribute('aria-current')
  })

  it('el panel de recomendaciones solo aparece debajo, nunca al lado (fullWidthContent — especificacion-final-formato-detalle.md §1)', async () => {
    render(<CaseDetail content={CONTENT} caseDetail={null} carousel={[]} />)

    await waitFor(() => {
      expect(screen.getByText('Recomendación 0')).toBeInTheDocument()
    })
    expect(screen.getAllByText(/^Recomendación/)).toHaveLength(4)
  })
})
