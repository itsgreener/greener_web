import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { BREAKPOINT_PX } from '@/modules/shared/domain/breakpoints'
import { BREAKPOINTS } from '@/modules/masonry/domain/layout'
import { MOBILE_BREAKPOINT_PX } from '@/modules/media/domain/videoPlayback'

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)

    if (statSync(path).isDirectory()) return cssFiles(path)

    return path.endsWith('.css') ? [path] : []
  })
}

function mediaWidths(file: string): number[] {
  const css = readFileSync(file, 'utf8')

  return [
    ...css.matchAll(/@media[^{]*\(\s*(?:max|min)-width:\s*(\d+)px\s*\)/g),
  ].map((match) => Number(match[1]))
}

describe('breakpoints', () => {
  it('el masonry y la reproducción de vídeo usan los mismos anchos', () => {
    expect(BREAKPOINTS.map((bp) => bp.maxWidth)).toEqual([
      BREAKPOINT_PX.mobile,
      BREAKPOINT_PX.tablet,
      BREAKPOINT_PX.desktop,
      Infinity,
    ])
    expect(MOBILE_BREAKPOINT_PX).toBe(BREAKPOINT_PX.mobile)
  })

  it('el escalón de 1080p del texto de las tarjetas está en CSS y en la estimación del rótulo', () => {
    expect(BREAKPOINT_PX.fullHd).toBe(1920)

    const globals = readFileSync('src/app/globals.css', 'utf8')
    expect(globals).toMatch(
      new RegExp(
        `@media \\(min-width: ${BREAKPOINT_PX.fullHd}px\\)\\s*\\{\\s*:root\\s*\\{\\s*--fs-card: 0\\.9rem;`,
      ),
    )
    expect(globals).toMatch(/--fs-card: 0\.8rem;/)
  })

  it('todos los CSS (web pública y ABM) solo usan anchos de BREAKPOINT_PX', () => {
    const allowed = new Set<number>(Object.values(BREAKPOINT_PX))

    for (const file of cssFiles('src')) {
      for (const width of mediaWidths(file)) {
        expect(allowed.has(width), `${file}: ${width}px`).toBe(true)
      }
    }
  })
})
