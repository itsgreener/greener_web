import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * Convenciones de CSS que no se pueden romper sin que falle algo (auditoría de
 * CSS del 23 oct 2026, apartado 9; pedido por Greener el 2 nov). Sin stylelint
 * ni dependencias nuevas.
 *
 *  - Los colores, radios, tamaños y pesos de texto viven como tokens en
 *    `globals.css` (web pública) y `admin.css` (ABM). Los módulos solo los
 *    consumen con `var(--…)`.
 *  - No hay `!important`.
 *  - Todo `var(--x)` apunta a algo que existe.
 *  - Un único gris de fondo (`--color-surface`).
 *  - Vocabulario del ABM: `error` (no `danger`) y `active` (no `selected` ni
 *    `chipActive`).
 */

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')

function walk(dir: string, accept: (name: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path, accept)
    return accept(name) ? [path] : []
  })
}

function read(path: string): string {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

const TOKEN_FILES = ['src/app/globals.css', 'src/app/admin/admin.css']

const CSS = walk(SRC, (name) => name.endsWith('.css')).map((path) => ({
  path: relative(ROOT, path).replaceAll('\\', '/'),
  css: stripComments(read(path)),
}))

const MODULES = CSS.filter((file) => file.path.endsWith('.module.css'))

const SOURCES = walk(SRC, (name) => /\.(ts|tsx)$/.test(name)).map((path) => ({
  path: relative(ROOT, path).replaceAll('\\', '/'),
  text: read(path),
}))

/** Declaraciones `propiedad: valor;` (las propias variables incluidas). */
function declarations(css: string): Array<{ prop: string; value: string }> {
  return [...css.matchAll(/([\w-]+)\s*:\s*([^;{}]+);/g)].map((match) => ({
    prop: match[1],
    value: match[2].trim(),
  }))
}

const LITERAL_COLOR =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(|\b(?:white|black|red|green|blue|gray|grey|yellow|orange|purple|pink|silver|navy|teal)\b/

describe('CSS: convenciones de tokens (2 nov 2026)', () => {
  it('hay hojas que revisar', () => {
    expect(MODULES.length).toBeGreaterThan(40)
    for (const path of TOKEN_FILES) {
      expect(
        CSS.some((file) => file.path === path),
        path,
      ).toBe(true)
    }
  })

  // Un color literal solo se escribe al definir un token, en una de las dos
  // hojas de tokens; en cualquier otro sitio se usa `var(--color-…)`.
  it.each(MODULES)('$path: ningún color literal', ({ css }) => {
    const offenders = declarations(css).filter(({ value }) =>
      LITERAL_COLOR.test(value.replace(/var\([^)]*\)/g, '')),
    )
    expect(offenders).toEqual([])
  })

  it.each(TOKEN_FILES)(
    '%s: los colores literales solo aparecen al definir una variable',
    (path) => {
      const file = CSS.find((entry) => entry.path === path)!
      const offenders = declarations(file.css).filter(
        ({ prop, value }) =>
          !prop.startsWith('--') &&
          LITERAL_COLOR.test(value.replace(/var\([^)]*\)/g, '')),
      )
      expect(offenders).toEqual([])
    },
  )

  it.each(CSS)('$path: sin !important', ({ css }) => {
    expect(css).not.toMatch(/!\s*important/)
  })

  // Las variables que fija el TSX en línea (`--ratio`, `--lines`…) o las que
  // define cualquier hoja cuentan como existentes.
  it('todo var(--x) apunta a una variable definida', () => {
    const defined = new Set<string>()
    for (const { css } of CSS) {
      for (const match of css.matchAll(/(--[\w-]+)\s*:/g)) defined.add(match[1])
    }
    for (const { text } of SOURCES) {
      for (const match of text.matchAll(/['"`](--[\w-]+)['"`]/g)) {
        defined.add(match[1])
      }
    }

    const missing = CSS.flatMap(({ path, css }) =>
      [...css.matchAll(/var\(\s*(--[\w-]+)/g)]
        .map((match) => match[1])
        .filter((name) => !defined.has(name))
        .map((name) => `${path}: ${name}`),
    )
    expect([...new Set(missing)]).toEqual([])
  })

  // Tamaño y peso de texto: tokens (`--fs-*`, `--admin-fs-*`), `inherit` o,
  // por diseño, unidades de contenedor (`cqw`: el título del episodio y el
  // pin de newsletter escalan con su caja y no tienen suelo en rem).
  it.each(MODULES)('$path: font-size y font-weight con tokens', ({ css }) => {
    const decl = declarations(css)

    const sizes = decl
      .filter(({ prop }) => prop === 'font-size')
      .map(({ value }) => value)
      .filter(
        (value) =>
          !/^(var\(--[\w-]+\)|inherit|0)$/.test(value) && !/\dcqw/.test(value),
      )
    expect(sizes).toEqual([])

    const weights = decl
      .filter(({ prop }) => prop === 'font-weight')
      .map(({ value }) => value)
      .filter((value) => !/^(400|700|inherit|var\(--[\w-]+\))$/.test(value))
    expect(weights).toEqual([])
  })

  // Radios: solo tokens (`--radius-*` en la web, `--admin-radius-*` en el
  // ABM) o 0. Los círculos y pastillas usan `--radius-pill` /
  // `--admin-radius-pill`, nunca `50%` ni `999px`.
  it.each(MODULES)('$path: radios con tokens', ({ css }) => {
    const offenders = declarations(css)
      .filter(({ prop }) => /radius$/.test(prop))
      .map(({ value }) => value)
      .filter(
        (value) =>
          !value
            .split(/\s+/)
            .every((part) => part === '0' || /^var\(--[\w-]+\)$/.test(part)),
      )
    expect(offenders).toEqual([])
  })

  // Los hex de TS/TSX son excepciones contadas: el CSS del documento de las
  // tools (`SHELL_STYLES`, sincronizado con la home por `shellStylesSync`) y
  // los cuatro colores de marca del logo de Google en el login.
  it('colores literales fuera del CSS: solo las excepciones documentadas', () => {
    const allowed = new Set([
      'src/modules/packages/application/composeToolDocument.ts',
      'src/app/admin/(auth)/login/page.tsx',
    ])
    const offenders = SOURCES.filter(
      ({ path, text }) =>
        !allowed.has(path) &&
        /['"`(\s:]#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b|\b(?:rgb|rgba|hsl|hsla)\(/.test(
          text,
        ),
    ).map(({ path }) => path)
    expect(offenders).toEqual([])
  })

  // ADM-D4: un único gris de fondo para toda la web.
  it('un solo gris de fondo: --color-surface', () => {
    const globals = CSS.find((file) => file.path === TOKEN_FILES[0])!.css
    const admin = CSS.find((file) => file.path === TOKEN_FILES[1])!.css

    expect(globals).toMatch(/--color-surface\s*:\s*#[0-9a-fA-F]{6}/)
    expect(globals).not.toMatch(/--color-surface-[\w-]+\s*:/)
    expect(admin).not.toMatch(/--admin-(?:page-bg|surface[\w-]*)\s*:/)
  })

  // color-mix() en la web pública: ≈5 % de los usuarios (Chrome < 111,
  // Safari < 16.2, Firefox < 113) no lo entiende y la variable queda inválida.
  // Los módulos públicos no lo usan: consumen tokens de globals.css, que
  // llevan el valor ya calculado y lo recalculan dentro de @supports. El ABM
  // (admin.css y los módulos de /admin) queda fuera: es de uso interno.
  describe('color-mix() con respaldo (web pública)', () => {
    const globals = CSS.find((file) => file.path === TOKEN_FILES[0])!.css

    // Contenido del bloque `@supports (color: color-mix(…)) { … }`.
    function supportsBlock(css: string): string {
      const start = css.indexOf('@supports (color: color-mix(')
      if (start === -1) return ''
      const open = css.indexOf('{', start)
      let depth = 0
      for (let i = open; i < css.length; i++) {
        if (css[i] === '{') depth++
        if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i)
      }
      return ''
    }

    type Rgba = [number, number, number, number]

    function parseColor(value: string): Rgba {
      const hex = value.match(/^#([0-9a-f]{6})$/i)
      if (hex) {
        const n = parseInt(hex[1], 16)
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
      }
      const rgb = value.match(
        /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+)(%)?\s*)?\)$/,
      )
      if (!rgb) throw new Error(`Color no reconocido: ${value}`)
      const alpha =
        rgb[4] === undefined ? 1 : Number(rgb[4]) / (rgb[5] ? 100 : 1)
      return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), alpha]
    }

    // color-mix(in srgb, A p%, B): interpolación con alfa premultiplicado.
    function mix(a: Rgba, p: number, b: Rgba): Rgba {
      const alpha = p * a[3] + (1 - p) * b[3]
      if (alpha === 0) return [0, 0, 0, 0]
      const channel = (i: number) =>
        (p * a[i] * a[3] + (1 - p) * b[i] * b[3]) / alpha
      return [channel(0), channel(1), channel(2), alpha]
    }

    const rootTokens = new Map<string, string>()
    for (const match of globals.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) {
      // El primer :root define los valores fijos; el de @supports, los recalculados.
      if (!rootTokens.has(match[1])) rootTokens.set(match[1], match[2].trim())
    }

    const block = supportsBlock(globals)
    const MIX =
      /color-mix\(\s*in srgb\s*,\s*var\((--[\w-]+)\)\s+(\d+)%\s*,\s*(transparent|var\((--[\w-]+)\))\s*\)/
    const overrides = [
      ...block.matchAll(/(--[\w-]+)\s*:\s*([^;{}]*color-mix\([^;{}]+);/g),
    ].map((match) => ({
      token: match[1],
      value: match[2].replace(/\s+/g, ' ').trim(),
    }))

    it('el bloque @supports recalcula los cinco tokens derivados', () => {
      expect(overrides.map(({ token }) => token).sort()).toEqual([
        '--color-cta-tint',
        '--color-cta-tint-light',
        '--color-error-tint',
        '--color-scrim',
        '--shadow-banner',
      ])
    })

    it('fuera de @supports no hay color-mix() en globals.css', () => {
      // La condición del propio @supports también nombra color-mix().
      const outside = globals
        .replace(block, '')
        .replace('@supports (color: color-mix(in srgb, red, blue))', '')
      expect(outside).not.toContain('color-mix(')
    })

    it('ningún módulo público usa color-mix() directamente', () => {
      const offenders = MODULES.filter(
        ({ path }) =>
          !path.startsWith('src/components/admin/') &&
          !path.startsWith('src/app/admin/'),
      )
        .filter(({ css }) => css.includes('color-mix('))
        .map(({ path }) => path)
      expect(offenders).toEqual([])
    })

    it.each(overrides)(
      '$token: el valor fijo coincide con color-mix() (±1 por canal)',
      ({ token, value }) => {
        const [expr] = value.match(MIX) ?? []
        expect(expr, `${token}: no se entiende ${value}`).toBeDefined()
        const [, base, percent, other, otherToken] = value.match(MIX)!
        const lookup = (name: string) => {
          const raw = rootTokens.get(name)
          if (!raw) throw new Error(`Falta el token ${name}`)
          return parseColor(raw)
        }
        const expected = mix(
          lookup(base),
          Number(percent) / 100,
          other === 'transparent' ? [0, 0, 0, 0] : lookup(otherToken),
        )

        // El valor fijo es el definido en el primer :root, que no puede
        // contener color-mix().
        const fixed = rootTokens.get(token)!
        expect(fixed).not.toContain('color-mix(')

        // Mismo prefijo (la sombra lleva `0 -8px 24px` delante del color).
        const colorOf = (text: string) =>
          text.match(/(#[0-9a-f]{6}|rgb\([^)]*\))\s*$/i)?.[1] ?? ''
        const prefixOf = (text: string, color: string) =>
          text.slice(0, text.length - color.length).trim()
        const fixedColor = colorOf(fixed)
        expect(fixedColor, `${token}: ${fixed}`).not.toBe('')
        expect(prefixOf(fixed, fixedColor)).toBe(
          prefixOf(value.replace(MIX, '#000000'), '#000000'),
        )

        const actual = parseColor(fixedColor)
        for (let i = 0; i < 3; i++) {
          expect(
            Math.abs(actual[i] - expected[i]),
            `${token}: canal ${i}, fijo ${actual[i]} frente a ${expected[i].toFixed(1)}`,
          ).toBeLessThanOrEqual(1)
        }
        expect(Math.abs(actual[3] - expected[3])).toBeLessThan(0.005)
      },
    )
  })

  // ADM-D3: vocabulario del ABM.
  it('vocabulario del ABM: error y active, sin danger, selected ni chipActive', () => {
    const offenders = MODULES.filter(
      ({ path }) =>
        path.startsWith('src/components/admin/') ||
        path.startsWith('src/app/admin/'),
    ).flatMap(({ path, css }) =>
      [...css.matchAll(/\.(danger\w*|selected|chipActive)\b/g)].map(
        (match) => `${path}: .${match[1]}`,
      ),
    )
    expect(offenders).toEqual([])
    expect(readFileSync(join(SRC, 'app/admin/admin.css'), 'utf8')).not.toMatch(
      /--admin-danger-/,
    )
  })
})
