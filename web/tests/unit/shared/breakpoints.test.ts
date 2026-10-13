import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  ADMIN_BREAKPOINT_PX,
  BREAKPOINT_PX,
} from '@/modules/shared/domain/breakpoints'
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

  return [...css.matchAll(/@media[^{]*\(\s*max-width:\s*(\d+)px\s*\)/g)].map(
    (match) => Number(match[1]),
  )
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

  it('los CSS de la web pública solo usan anchos de BREAKPOINT_PX', () => {
    const allowed = new Set<number>(Object.values(BREAKPOINT_PX))
    const files = cssFiles('src').filter(
      (file) => !file.replaceAll('\\', '/').includes('src/app/admin/'),
    )

    for (const file of files) {
      for (const width of mediaWidths(file)) {
        expect(allowed.has(width), `${file}: ${width}px`).toBe(true)
      }
    }
  })

  it('el CSS del ABM solo usa anchos de ADMIN_BREAKPOINT_PX', () => {
    const allowed = new Set<number>(ADMIN_BREAKPOINT_PX)

    for (const width of mediaWidths('src/app/admin/admin.css')) {
      expect(allowed.has(width), `${width}px`).toBe(true)
    }
  })
})
