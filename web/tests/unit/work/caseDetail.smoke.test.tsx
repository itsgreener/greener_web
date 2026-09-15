// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { CaseDetail } from '@/app/(public)/work/[slug]/CaseDetail'
import type { PublicContent } from '@/modules/content/infrastructure/publicContentSource'

const CONTENT: PublicContent = {
  id: 'content-1',
  type: 'case',
  slug: 'mi-caso',
  defaultLocale: 'es',
  title: 'Mi caso',
  seoTitle: null,
  seoDescription: null,
  summary: null,
  highlight: 'Un subtítulo destacado',
  body: 'El cuerpo del caso.',
  coverMedia: null,
}

describe('CaseDetail — prueba de humo', () => {
  afterEach(cleanup)

  it('pinta título, highlight, body y cliente', () => {
    render(
      <CaseDetail
        content={CONTENT}
        caseDetail={{ client: 'Agróptimum' }}
        carousel={[]}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Mi caso' })).toBeInTheDocument()
    expect(screen.getByText('Un subtítulo destacado')).toBeInTheDocument()
    expect(screen.getByText('El cuerpo del caso.')).toBeInTheDocument()
    expect(screen.getByText('Agróptimum')).toBeInTheDocument()
  })

  it('sin case_detail (dato ausente), no revienta y simplemente omite el cliente', () => {
    render(<CaseDetail content={CONTENT} caseDetail={null} carousel={[]} />)

    expect(screen.getByRole('heading', { name: 'Mi caso' })).toBeInTheDocument()
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
          },
          {
            mediaId: 'm2',
            kind: 'video',
            cloudinaryPublicId: 'vid1',
            sortOrder: 1,
            alt: 'Vídeo de la cosecha',
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

  it('sin carrusel (array vacío), no pinta ningún contenedor de carrusel', () => {
    const { container } = render(
      <CaseDetail content={CONTENT} caseDetail={null} carousel={[]} />,
    )

    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(container.querySelector('video')).not.toBeInTheDocument()
  })
})
