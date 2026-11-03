import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Contraste del texto del ABM (plan de mejoras, §6). Calcula la razón de
 * contraste WCAG 2.x de cada token de texto contra cada fondo en el que puede
 * caer y falla por debajo de 4,5:1 (AA para texto normal), para que la paleta
 * no se salga sin aviso. Los valores se leen de `globals.css` y `admin.css`,
 * no se copian aquí.
 */

const MIN_AA = 4.5

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

/** Valor hexadecimal de `--token` dentro de `:root` (el primero que aparezca). */
function token(css: string, name: string): string {
  const match = css.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{6})\\s*;`))
  if (!match) throw new Error(`No encuentro ${name} como #rrggbb`)
  return match[1]
}

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  )
}

function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

const globals = read('src/app/globals.css')
const admin = read('src/app/admin/admin.css')

const BACKGROUNDS = {
  '--color-bg': token(globals, '--color-bg'),
  '--color-surface': token(globals, '--color-surface'),
}

const TEXTS = {
  '--color-text': token(globals, '--color-text'),
  '--admin-text-secondary': token(admin, '--admin-text-secondary'),
  '--admin-text-muted': token(admin, '--admin-text-muted'),
  '--color-cta': token(globals, '--color-cta'),
}

describe('contraste del texto del ABM (WCAG AA, 4,5:1)', () => {
  it('calcula bien la razón de contraste (blanco/negro 21:1, mismo color 1:1)', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5)
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5)
  })

  const pairs = Object.entries(TEXTS).flatMap(([text, fg]) =>
    Object.entries(BACKGROUNDS).map(
      ([background, bg]) => [text, fg, background, bg] as const,
    ),
  )

  it.each(pairs)('%s (%s) sobre %s (%s)', (_text, fg, _background, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(MIN_AA)
  })

  it('el error de formularios cumple sobre el fondo blanco', () => {
    expect(
      contrastRatio(token(globals, '--color-error'), BACKGROUNDS['--color-bg']),
    ).toBeGreaterThanOrEqual(MIN_AA)
  })
})
