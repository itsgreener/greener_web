import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()

function modules(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return modules(path)
    return name.endsWith('.module.css') ? [path] : []
  })
}

const FILES = modules(join(ROOT, 'src')).map((path) => ({
  path: relative(ROOT, path).replaceAll('\\', '/'),
  css: readFileSync(path, 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, ''),
}))

/** Reglas de primer nivel: selector y cuerpo (sin entrar en los @media). */
function topLevelRules(css: string) {
  const rules: Array<{ selector: string; body: string }> = []
  let depth = 0
  let start = 0
  let head = ''
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') {
      if (depth === 0) {
        head = css.slice(start, i).trim()
        start = i + 1
      }
      depth++
    } else if (css[i] === '}') {
      depth--
      if (depth === 0) {
        rules.push({ selector: head, body: css.slice(start, i) })
        start = i + 1
      }
    }
  }
  return rules
}

describe('módulos CSS: convenciones de la auditoría (23 oct 2026)', () => {
  it('hay módulos que revisar', () => {
    expect(FILES.length).toBeGreaterThan(40)
  })

  // §24.1: las variantes, estados y descendientes de una clase van anidados
  // con `&` dentro de su regla, no como selectores planos aparte.
  it.each(FILES)(
    '$path: nada de `.x:hover` o `.x .y` plano si `.x { … }` ya existe',
    ({ css }) => {
      const rules = topLevelRules(css).filter(
        (r) => !r.selector.startsWith('@'),
      )
      const plainBase = new Map<number, string>()
      rules.forEach((rule, index) => {
        if (
          /^\.[\w-]+$/.test(rule.selector) &&
          !/composes\s*:/.test(rule.body)
        ) {
          plainBase.set(index, rule.selector)
        }
      })

      const offenders = rules
        .filter((rule, index) => {
          // Una lista con bases distintas (`.a:focus, .b:focus`) comparte
          // declaraciones entre clases y se queda plana a propósito.
          const parts = rule.selector.split(',').map((part) => part.trim())
          const bases = new Set(
            parts.map((part) => part.match(/^\.[\w-]+/)?.[0]),
          )
          const [base] = bases
          if (
            bases.size !== 1 ||
            !base ||
            parts.every((part) => part === base)
          ) {
            return false
          }
          // La base debe haberse declarado antes.
          return [...plainBase].some(
            ([baseIndex, selector]) => selector === base && baseIndex < index,
          )
        })
        .map((rule) => rule.selector)

      expect(offenders).toEqual([])
    },
  )

  // Todas las transiciones leen --transition (o --admin-transition, que es
  // la misma): así prefers-reduced-motion las apaga desde un único sitio.
  it.each(FILES)(
    '$path: las transiciones usan la variable de duración',
    ({ css }) => {
      const declarations = [...css.matchAll(/transition\s*:([^;]+);/g)].map(
        (match) => match[1],
      )
      const literal = declarations.filter(
        (value) =>
          value.trim() !== 'none' &&
          // 9999s: retraso del autorrelleno de Chrome, no es una animación.
          !/9999s/.test(value) &&
          /\d+(\.\d+)?m?s\b/.test(value.replace(/var\([^)]*\)/g, '')),
      )
      expect(literal).toEqual([])
    },
  )

  // El foco visible usa los tokens de grosor y separación de globals.css.
  it.each(FILES)('$path: el contorno de foco usa los tokens', ({ css }) => {
    const offsets = [...css.matchAll(/outline-offset\s*:([^;]+);/g)].map(
      (match) => match[1].trim(),
    )
    expect(
      offsets.filter((value) => !value.startsWith('var(--focus-')),
    ).toEqual([])
  })
})
