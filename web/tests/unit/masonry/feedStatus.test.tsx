// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { FeedStatus } from '@/components/masonry/FeedStatus'
import { recommendationsCopy } from '@/components/detail/copy'
import { feedCopy } from '@/components/masonry/copy'

const base = {
  error: false,
  isLoading: false,
  itemCount: 0,
  hasMore: true,
  copy: feedCopy,
}

describe('FeedStatus', () => {
  it('error: siempre el texto de loadError del copy, nunca otro', () => {
    render(<FeedStatus {...base} error />)

    expect(screen.getByText(feedCopy.loadError)).toBeInTheDocument()
  })

  it('el error manda sobre carga y contenido', () => {
    render(<FeedStatus {...base} error isLoading itemCount={5} />)

    expect(screen.getByText(feedCopy.loadError)).toBeInTheDocument()
    expect(screen.queryByText(feedCopy.loading)).not.toBeInTheDocument()
  })

  it('primera carga: sin elementos y cargando', () => {
    render(<FeedStatus {...base} isLoading />)

    expect(screen.getByText(feedCopy.loading)).toBeInTheDocument()
  })

  it('vacío: sin elementos, sin cargar y sin más páginas', () => {
    render(<FeedStatus {...base} hasMore={false} />)

    expect(screen.getByText(feedCopy.empty)).toBeInTheDocument()
  })

  it('sin elementos pero con más páginas por pedir no pinta nada', () => {
    const { container } = render(<FeedStatus {...base} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('con elementos a la vista no pinta nada, aunque esté cargando otra página', () => {
    const { container } = render(
      <FeedStatus {...base} isLoading itemCount={3} hasMore={false} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('usa los textos y la clase que se le pasan (recomendaciones)', () => {
    render(
      <FeedStatus
        {...base}
        copy={recommendationsCopy}
        className="status"
        isLoading
      />,
    )

    const p = screen.getByText(recommendationsCopy.loading)
    expect(p).toHaveClass('status')
  })
})
