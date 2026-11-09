import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * El recorte a N líneas necesita `overflow: hidden`, pero con un interlineado
 * apretado corta los rabillos (g, p, y…) de la última línea. Comprobado en
 * Chrome con Kinder: a 1.05 o `normal` se cortan, a 1.2 no. Este test fija
 * las dos mitades: el overflow sigue y los títulos en Kinder con recorte
 * llevan al menos 1.2.
 */
const read = (path: string) =>
  readFileSync(join(process.cwd(), 'src/components', path), 'utf8')

function rule(css: string, selector: string) {
  const start = css.indexOf(`\n${selector} {`)

  return css.slice(start, css.indexOf('\n}', start))
}

describe('lineClamp y rabillos de los títulos', () => {
  it('lineClamp conserva overflow: hidden', () => {
    expect(read('text/lineClamp.module.css')).toMatch(/overflow:\s*hidden/)
  })

  it.each([
    ['detail/CaseDetail/CaseDetail.module.css'],
    ['detail/EpisodeDetail/EpisodeDetail.module.css'],
  ])('%s: el .title recortado lleva line-height >= 1.2', (file) => {
    const match = rule(read(file), '.title').match(/line-height:\s*([\d.]+)/)

    expect(match, 'el título necesita line-height explícito').not.toBeNull()
    expect(Number(match?.[1])).toBeGreaterThanOrEqual(1.2)
  })
})
