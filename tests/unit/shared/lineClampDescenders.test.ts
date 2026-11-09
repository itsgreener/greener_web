import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * El recorte a N líneas necesita `overflow: hidden`, pero con un interlineado
 * apretado corta los rabillos (g, p, y…) de la última línea. Comprobado en
 * Chrome con Kinder: sin ayuda hace falta 1.2 (demasiado suelto); con el
 * colchón de `lineClamp` (.15em arriba y abajo) un interlineado de .9 corta
 * solo 4 px. Este test fija las dos mitades: el overflow con su colchón y un
 * interlineado explícito en los títulos.
 */
const read = (path: string) =>
  readFileSync(join(process.cwd(), 'src/components', path), 'utf8')

function rule(css: string, selector: string) {
  const start = css.indexOf(`\n${selector} {`)

  return css.slice(start, css.indexOf('\n}', start))
}

describe('lineClamp y rabillos de los títulos', () => {
  it('lineClamp conserva overflow: hidden y su colchón neutro', () => {
    const css = read('text/lineClamp.module.css')

    expect(css).toMatch(/overflow:\s*hidden/)
    expect(css).toMatch(/padding-block:\s*0\.15em/)
    expect(css).toMatch(/margin-block:\s*-0\.15em/)
  })

  it.each([
    ['detail/CaseDetail/CaseDetail.module.css'],
    ['detail/EpisodeDetail/EpisodeDetail.module.css'],
  ])('%s: el .title recortado tiene line-height explícito', (file) => {
    const match = rule(read(file), '.title').match(/line-height:\s*([\d.]+)/)

    expect(match, 'el título necesita line-height explícito').not.toBeNull()
    expect(Number(match?.[1])).toBeGreaterThan(0)
  })
})
