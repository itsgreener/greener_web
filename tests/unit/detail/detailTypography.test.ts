import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

const globals = read('src/app/globals.css')

/** Valor de una declaración `--nombre: ...;` de :root (puede ocupar varias líneas). */
function token(name: string): string {
  const match = globals.match(new RegExp(`${name}:\\s*([^;]+);`))
  if (!match) throw new Error(`Falta ${name} en globals.css`)
  return match[1].replace(/\s+/g, ' ').trim()
}

// La rampa del título, evaluada a mano con 16 px por rem. El test lee la
// fórmula de globals.css y comprueba que las anclas son las pedidas.
function titlePx(viewportPx: number): number {
  expect(token('--fs-detail-title')).toBe(
    'clamp( 1.725rem, max(1.125rem + 1.25vw, min(2.5vw, 1.5rem + 1.25vw)), 3.5rem )',
  )
  const vw = viewportPx / 100
  const first = 1.125 * 16 + 1.25 * vw
  const second = 2.5 * vw
  const third = 1.5 * 16 + 1.25 * vw
  const value = Math.max(first, Math.min(second, third))
  return Math.min(Math.max(value, 1.725 * 16), 3.5 * 16)
}

function ramp(
  name: string,
  expected: string,
  floorRem: number,
  capRem: number,
  steepVw: number,
  flatRem: number,
  flatVw: number,
) {
  return (viewportPx: number): number => {
    expect(token(name)).toBe(expected)
    const vw = viewportPx / 100
    const value = Math.min(steepVw * vw, flatRem * 16 + flatVw * vw)
    return Math.min(Math.max(value, floorRem * 16), capRem * 16)
  }
}

const highlightPx = ramp(
  '--fs-detail-highlight',
  'clamp( 0.75rem, min(0.8333vw, 0.625rem + 0.3125vw), 1.125rem )',
  0.75,
  1.125,
  0.8333,
  0.625,
  0.3125,
)
const bodyPx = ramp(
  '--fs-detail-body',
  'clamp( 0.65625rem, min(0.7292vw, 0.5rem + 0.3125vw), 1rem )',
  0.65625,
  1,
  0.7292,
  0.5,
  0.3125,
)

describe('tipografía fluida de las fichas de detalle', () => {
  it('el título pasa por las anclas de Greener: 36 px a 1440, 48 a 1920 y 56 a 2560', () => {
    expect(titlePx(1440)).toBeCloseTo(36, 1)
    expect(titlePx(1920)).toBeCloseTo(48, 1)
    expect(titlePx(2560)).toBeCloseTo(56, 1)
  })

  it('el título es plano fuera del rango (768-2560) y crece de forma monótona dentro', () => {
    expect(titlePx(320)).toBeCloseTo(titlePx(768), 5)
    expect(titlePx(3840)).toBeCloseTo(56, 5)

    let previous = titlePx(768)
    for (let width = 800; width <= 2560; width += 32) {
      const current = titlePx(width)
      expect(current).toBeGreaterThanOrEqual(previous)
      previous = current
    }
  })

  it('destacado y cuerpo pasan por las anclas de Greener: 12/10,5 a 1440, 16/14 a 1920 y 18/16 a 2560', () => {
    expect(highlightPx(1440)).toBeCloseTo(12, 1)
    expect(bodyPx(1440)).toBeCloseTo(10.5, 1)
    expect(highlightPx(1920)).toBeCloseTo(16, 1)
    expect(bodyPx(1920)).toBeCloseTo(14, 1)
    expect(highlightPx(2560)).toBeCloseTo(18, 1)
    expect(bodyPx(2560)).toBeCloseTo(16, 1)
  })

  it('destacado y cuerpo son planos por debajo de 1440 y por encima de 2560, y no decrecen entre medias', () => {
    expect(highlightPx(768)).toBeCloseTo(12, 5)
    expect(bodyPx(768)).toBeCloseTo(10.5, 5)
    expect(highlightPx(3840)).toBeCloseTo(18, 5)
    expect(bodyPx(3840)).toBeCloseTo(16, 5)

    for (const size of [highlightPx, bodyPx]) {
      let previous = size(768)
      for (let width = 800; width <= 2560; width += 32) {
        expect(size(width)).toBeGreaterThanOrEqual(previous)
        previous = size(width)
      }
    }
  })

  it('--fs-3xl sigue siendo 3rem para el resto de páginas', () => {
    expect(token('--fs-3xl')).toBe('3rem')
  })

  it.each([
    ['src/components/detail/CaseDetail/CaseDetail.module.css'],
    ['src/components/detail/EpisodeDetail/EpisodeDetail.module.css'],
    ['src/components/detail/ToolInsightDetail/ToolInsightDetail.module.css'],
  ])('%s usa solo los tokens fluidos para su texto', (path) => {
    const css = read(path)
    const sizes = [...css.matchAll(/font-size:\s*([^;]+);/g)].map((m) => m[1])
    expect(sizes.length).toBeGreaterThan(0)
    for (const size of sizes) {
      expect(size).toMatch(/^var\(--fs-detail-(title|highlight|body)\)$/)
    }
  })
})
