// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { CaseDetail } from '@/components/detail/CaseDetail'
import type {
  PublicCaseCarouselItem,
  PublicContent,
} from '@/modules/content/domain/publicContent'

/**
 * `preload` de los vídeos del carrusel de un caso (plan §5): la primera
 * diapositiva pide los metadatos y las demás nada hasta que se pulsa play; con
 * `save-data` o una conexión lenta, ninguna. El carrusel no tiene movimiento
 * que reducir (scroll nativo, sin autoplay): `prefers-reduced-motion` no
 * interviene.
 */

const CONTENT: PublicContent = {
  id: 'c1',
  type: 'case',
  slug: 'mi-caso',
  defaultLocale: 'es',
  locale: 'es',
  availableLocales: ['es'],
  publishedAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-15T10:00:00.000Z',
  title: 'Mi caso',
  seoTitle: null,
  seoDescription: null,
  summary: null,
  highlight: null,
  body: null,
}

function item(index: number, kind: 'image' | 'video'): PublicCaseCarouselItem {
  return {
    mediaId: `m${index}`,
    kind,
    cloudinaryPublicId: `casos/medio-${index}`,
    sortOrder: index,
    alt: `Medio ${index}`,
    width: 1920,
    height: 1080,
  }
}

function setConnection(connection: object | undefined) {
  Object.defineProperty(navigator, 'connection', {
    value: connection,
    configurable: true,
  })
}

function preloads(carousel: PublicCaseCarouselItem[]) {
  const { container } = render(
    <CaseDetail content={CONTENT} caseDetail={null} carousel={carousel} />,
  )

  return Array.from(container.querySelectorAll('video')).map((video) =>
    video.getAttribute('preload'),
  )
}

beforeEach(() => {
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver
  // @ts-expect-error -- stub mínimo suficiente
  global.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  }
  global.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ sessionId: 's', items: [], hasMore: false }),
  })) as unknown as typeof fetch
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  })
  setConnection(undefined)
})

afterEach(() => {
  setConnection(undefined)
  vi.restoreAllMocks()
})

describe('CaseDetail — preload de los vídeos del carrusel', () => {
  it('la primera diapositiva pide los metadatos y las siguientes no piden nada', () => {
    expect(
      preloads([item(0, 'video'), item(1, 'video'), item(2, 'video')]),
    ).toEqual(['metadata', 'none', 'none'])
  })

  it('«primera» es la primera diapositiva, no el primer vídeo', () => {
    expect(preloads([item(0, 'image'), item(1, 'video')])).toEqual(['none'])
  })

  it('con save-data ninguna pide nada', () => {
    setConnection({ saveData: true })

    expect(preloads([item(0, 'video'), item(1, 'video')])).toEqual([
      'none',
      'none',
    ])
  })

  it.each(['2g', 'slow-2g'])(
    'con una conexión %s ninguna pide nada',
    (effectiveType) => {
      setConnection({ effectiveType })

      expect(preloads([item(0, 'video')])).toEqual(['none'])
    },
  )

  it('con un ancho de banda estimado bajo ninguna pide nada', () => {
    setConnection({ downlink: 0.5 })

    expect(preloads([item(0, 'video')])).toEqual(['none'])
  })

  it('prefers-reduced-motion no cambia el preload: el carrusel no se anima', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    })

    expect(preloads([item(0, 'video'), item(1, 'video')])).toEqual([
      'metadata',
      'none',
    ])
  })
})
