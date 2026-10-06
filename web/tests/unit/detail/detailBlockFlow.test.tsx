// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('@/modules/analytics/analytics', () => ({
  trackAnalyticsEvent: vi.fn(),
}))

import { CaseDetail } from '@/app/(public)/work/[slug]/CaseDetail'
import { EpisodeDetail } from '@/app/(public)/work/[slug]/EpisodeDetail'
import { ToolInsightDetail } from '@/components/detail/ToolInsightDetail'
import type { PublicContent } from '@/modules/content/infrastructure/publicContentSource'
import type { PublicEpisode } from '@/modules/content/infrastructure/publicEpisodeSource'
import type { FeedBatchResult } from '@/modules/feed/application/getFeedSessionBatch'

/**
 * Tipo B (caso/episodio): el bloque de contenido va EN FLUJO, encima del
 * lienzo de recomendaciones, para que un margin-bottom funcione (5 oct
 * 2026). Tipo A (tool/insight/other) conserva el bloque en absoluto dentro
 * del lienzo y su separación de siempre.
 */

function content(type: PublicContent['type']): PublicContent {
  return {
    id: 'content-1',
    type,
    slug: 'mi-contenido',
    defaultLocale: 'es',
    locale: 'es',
    availableLocales: ['es'],
    title: 'Mi contenido',
    seoTitle: null,
    seoDescription: null,
    summary: null,
    highlight: null,
    body: null,
    coverMedia: null,
    coverRatio: null,
  }
}

const EPISODE: PublicEpisode = {
  program: 'brand_the_future',
  provider: 'youtube',
  embedId: 'abc123',
  episodeKind: 'podcast',
}

function fakeBatch(count: number): FeedBatchResult {
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
    round: 0,
    hasMore: false,
  }
}

function css(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

// Cuerpo de la regla `.contentBlock { … }` (la primera del fichero).
function contentBlockRule(source: string): string {
  // Sin comentarios: pueden contener llaves y cortar la regla antes de tiempo.
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '')
  const match = clean.match(/\.contentBlock\s*\{([^}]*)\}/)

  expect(match).not.toBeNull()

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

    return { ok: true, json: async () => fakeBatch(4) } as Response
  }) as typeof fetch
})

afterEach(() => {
  vi.restoreAllMocks()
})

function parts(container: HTMLElement) {
  return {
    article: container.querySelector('article')!,
    block: container.querySelector('[class*="contentBlock"]')!,
    canvas: container.querySelector('[class*="canvas"]')!,
  }
}

describe('detalle tipo B (caso y episodio): bloque en flujo, fuera del lienzo', () => {
  it.each([
    [
      'caso',
      () => (
        <CaseDetail
          content={content('case')}
          caseDetail={{ client: 'Cliente' }}
          carousel={[]}
        />
      ),
    ],
    [
      'episodio',
      () => <EpisodeDetail content={content('episode')} episode={EPISODE} />,
    ],
  ])(
    '%s: el bloque es hermano del lienzo y va ANTES, no dentro',
    async (_name, view) => {
      const { container } = render(view())

      const { article, block, canvas } = parts(container)

      expect(canvas.contains(block)).toBe(false)
      expect(block.parentElement).toBe(article)
      expect(canvas.parentElement).toBe(article)
      expect(
        block.compareDocumentPosition(canvas) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    },
  )

  it.each([
    [
      'caso',
      () => (
        <CaseDetail content={content('case')} caseDetail={null} carousel={[]} />
      ),
    ],
    [
      'episodio',
      () => <EpisodeDetail content={content('episode')} episode={EPISODE} />,
    ],
  ])(
    '%s: las recomendaciones arrancan en y=0 del lienzo (ya no a la altura del bloque + 12 px) y el lienzo mide solo el masonry',
    async (_name, view) => {
      const { container } = render(view())

      await waitFor(() => {
        expect(container.querySelectorAll('[style*="translate("]').length).toBe(
          4,
        )
      })

      const transforms = Array.from(
        container.querySelectorAll<HTMLElement>('[style*="translate("]'),
      ).map((el) => el.style.transform)

      // 4 tarjetas 1:1 en 6 columnas: cada una en su columna, todas arriba.
      for (const transform of transforms) {
        expect(transform).toMatch(/, 0px\)$/)
      }

      // 190 de medio (1200 px, 6 columnas) + 27 de rótulo + 12 de GAP.
      expect(parts(container).canvas).toHaveStyle({ height: '229px' })
    },
  )

  it('el lienzo no reserva altura hasta que hay recomendaciones (el bloque ya no depende de él)', () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch

    const { container } = render(
      <CaseDetail content={content('case')} caseDetail={null} carousel={[]} />,
    )

    expect(parts(container).canvas.getAttribute('style') ?? '').not.toMatch(
      /height:\s*[1-9]/,
    )
  })

  it.each([
    'src/app/(public)/work/[slug]/CaseDetail.module.css',
    'src/app/(public)/work/[slug]/EpisodeDetail.module.css',
  ])(
    '%s: .contentBlock ya no es position: absolute y lleva margin-bottom con el token global',
    (path) => {
      const rule = contentBlockRule(css(path))

      expect(rule).not.toMatch(/position:\s*absolute/)
      expect(rule).not.toMatch(/(^|[\s;])(top|left):/)
      expect(rule).toMatch(/margin-bottom:\s*var\(--detail-block-gap\)/)
    },
  )

  it('el token --detail-block-gap está definido una sola vez, en globals.css', () => {
    expect(css('src/app/globals.css')).toMatch(
      /--detail-block-gap:\s*var\(--space-xl\)/,
    )
  })
})

describe('detalle tipo A (tool): se queda como estaba', () => {
  it('el bloque sigue DENTRO del lienzo, posicionado en absoluto', () => {
    const { container } = render(
      <ToolInsightDetail content={content('tool')} />,
    )

    const { canvas, block } = parts(container)

    expect(canvas.contains(block)).toBe(true)
  })

  it('el CSS de .contentBlock de tool/insight conserva position: absolute y NO usa el margen nuevo', () => {
    const rule = contentBlockRule(
      css('src/components/detail/ToolInsightDetail.module.css'),
    )

    expect(rule).toMatch(/position:\s*absolute/)
    expect(rule).not.toMatch(/--detail-block-gap/)
    expect(rule).not.toMatch(/margin-bottom/)
  })
})

describe('margen derecho del masonry en caso y episodio (6 oct 2026)', () => {
  // Bug real (reproducido en Chromium): el bloque de caso/episodio, ya en
  // flujo, llevaba `style={{ width: <px medidos por JS> }}`. Ese ancho fijaba
  // el ancho mínimo de contenido de la columna del Shell (pista 1fr); al
  // aparecer la barra de scroll al cargar las recomendaciones (−15 px) la
  // columna no podía encogerse, el lienzo seguía midiendo el ancho viejo y
  // las tarjetas se salían hacia el padding derecho (1 px de margen en vez
  // de 16, y scroll horizontal). La tool no lo sufría: su bloque va en
  // absoluto. Estos tests fijan las dos piezas del arreglo; el
  // comportamiento de layout real solo se puede comprobar en un navegador.

  it.each([
    [
      'caso',
      () => (
        <CaseDetail content={content('case')} caseDetail={null} carousel={[]} />
      ),
    ],
    [
      'episodio',
      () => <EpisodeDetail content={content('episode')} episode={EPISODE} />,
    ],
  ])(
    '%s: el bloque NO lleva un ancho en píxeles inline (no fija el ancho mínimo de la columna)',
    (_name, view) => {
      const { container } = render(view())

      const { block } = parts(container)

      expect(block.getAttribute('style') ?? '').not.toMatch(/width/)
    },
  )

  it.each([
    'src/app/(public)/work/[slug]/CaseDetail.module.css',
    'src/app/(public)/work/[slug]/EpisodeDetail.module.css',
  ])('%s: .contentBlock mide el 100 %% del contenedor por CSS', (path) => {
    expect(contentBlockRule(css(path))).toMatch(/(^|[\s;])width:\s*100%/)
  })

  it('el Shell deja que su columna 1fr se encoja: .content lleva min-width: 0', () => {
    const shell = css('src/components/shell/Shell/Shell.module.css').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    const rule = shell.match(/\.content\s*\{([^}]*)\}/)

    expect(rule).not.toBeNull()
    expect(rule![1]).toMatch(/min-width:\s*0/)
  })
})
