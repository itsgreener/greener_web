// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ToolInsightDetail } from '@/components/detail/ToolInsightDetail'
import type { PublicContent } from '@/modules/content/infrastructure/publicContentSource'

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
}

describe('ToolInsightDetail — prueba de humo', () => {
  afterEach(cleanup)

  it('pinta título, summary y el CTA "Use" apuntando a /app', () => {
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
  })

  it('con un insight, el CTA es "Read" en vez de "Use"', () => {
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
})
