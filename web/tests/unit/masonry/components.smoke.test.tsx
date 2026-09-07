// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MasonryFeed } from '@/components/masonry/MasonryFeed'
import { PinCard } from '@/components/pin/PinCard'
import type { FeedBatchResult } from '@/modules/feed/application/getDemoFeedBatch'

function fakeBatch(offset: number, count: number): FeedBatchResult {
  return {
    items: Array.from({ length: count }, (_, i) => ({
      pinId: `pin-${offset + i}`,
      contentId: `case-${offset + i}`,
      kind: 'case',
      destination: `/work/case-${offset + i}`,
      ratio: '1:1',
      label: `Pin ${offset + i}`,
      cta: 'Ver caso',
      alt: `Alt del pin ${offset + i}`,
      cloudinaryPublicId: 'sample',
      relaxationLevel: 0,
    })),
    nextOffset: offset + count,
    hasMore: true,
  }
}

describe('PinCard — prueba de humo', () => {
  it('renderiza sin lanzar, con la imagen, el alt y el enlace correctos', () => {
    render(
      <PinCard
        pin={{
          pinId: 'p1',
          destination: '/work/mi-caso',
          ratio: '4:5',
          label: 'Mi caso',
          cta: 'Ver caso',
          alt: 'Texto alternativo',
          cloudinaryPublicId: 'sample',
        }}
        style={{ x: 0, y: 0, width: 300, height: 375 }}
      />,
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/work/mi-caso')
    expect(screen.getByAltText('Texto alternativo')).toBeInTheDocument()
    expect(screen.getByText('Mi caso')).toBeInTheDocument()
    expect(screen.getByText('Ver caso')).toBeInTheDocument()
  })
})

describe('MasonryFeed — prueba de humo', () => {
  beforeEach(() => {
    // ResizeObserver e IntersectionObserver no existen en jsdom.
    // @ts-expect-error -- stub mínimo suficiente para el smoke test
    global.ResizeObserver = class {
      observe() {}
      disconnect() {}
    }
    // @ts-expect-error -- stub mínimo suficiente para el smoke test
    global.IntersectionObserver = class {
      observe() {}
      disconnect() {}
    }

    global.fetch = vi.fn(async (url: string) => {
      const u = new URL(url, 'http://localhost')
      const offset = Number(u.searchParams.get('offset') ?? '0')
      const count = Number(u.searchParams.get('count') ?? '40')
      return {
        ok: true,
        json: async () => fakeBatch(offset, count),
      } as Response
    }) as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('monta sin lanzar y acaba pidiendo y renderizando el primer lote', async () => {
    render(<MasonryFeed />)

    await waitFor(() => {
      expect(screen.getByText('40 pines cargados')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('offset=0'),
    )
  })
})
