import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const ROOT = process.cwd()
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8')

type Rules = Map<string, Map<string, string>>

/** Quita los comentarios y reduce el espacio en blanco. */
function clean(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function normalizeSelector(selector: string): string {
  return selector
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim()
}

/** Aplana un CSS con nesting de un nivel o más: `selector → propiedades`. */
function parseRules(css: string): Rules {
  const rules: Rules = new Map()
  let index = 0
  const text = clean(css)

  function block(parents: string[]) {
    let buffer = ''
    const declarations = new Map<string, string>()

    while (index < text.length) {
      const char = text[index++]

      if (char === '{') {
        const selectors = buffer
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)
        buffer = ''
        const resolved = parents.length
          ? selectors.flatMap((child) =>
              parents.map((parent) =>
                child.includes('&')
                  ? child.replace(/&/g, parent)
                  : `${parent} ${child}`,
              ),
            )
          : selectors
        block(resolved)
      } else if (char === '}') {
        break
      } else if (char === ';') {
        const [property, ...value] = buffer.split(':')
        if (property.trim()) {
          declarations.set(
            property.trim(),
            value.join(':').replace(/\s+/g, ' ').trim(),
          )
        }
        buffer = ''
      } else {
        buffer += char
      }
    }

    if (parents.length && declarations.size) {
      const key = normalizeSelector(parents.join(','))
      const current = rules.get(key) ?? new Map<string, string>()
      for (const [property, value] of declarations) current.set(property, value)
      rules.set(key, current)
    }
  }

  block([])
  return rules
}

const globals = parseRules(
  `:root { ${read('src/app/globals.css').match(/:root\s*\{([\s\S]*?)\n\}/)![1]} }`,
)
const tokens = globals.get(':root')!

/** Sustituye var(--x) por su valor en globals.css. */
function resolveVars(value: string): string {
  let result = value
  for (let i = 0; i < 4; i++) {
    result = result.replace(
      /var\((--[\w-]+)\)/g,
      (whole, name: string) => tokens.get(name) ?? whole,
    )
  }
  return result
}

const CLASS_MAP: Record<string, string> = {
  sidebar: 'greener-sidebar',
  logo: 'greener-logo',
  navGroup: 'greener-nav-group',
  socialGroup: 'greener-social-group',
  iconLink: 'greener-icon-link',
  icon: 'greener-icon',
  tooltip: 'greener-tooltip',
}

/** Rutas que no tienen equivalente en el documento. */
const HOME_ONLY = new Set(['.shell', '.content'])

/**
 * Diferencias DELIBERADAS de la barra lateral: en la home es `sticky` dentro
 * de un grid; en el documento de una tool es `fixed` y con ancho propio
 * (ver el comentario de composeToolDocument).
 */
const KNOWN_DIFFERENCES: Record<string, string[]> = {
  '.greener-sidebar': ['position', 'left', 'width', 'box-sizing'],
}

function toDocSelector(homeSelector: string): string {
  return homeSelector.replace(/\.(\w+)/g, (whole, name: string) =>
    CLASS_MAP[name] ? `.${CLASS_MAP[name]}` : whole,
  )
}

const home = parseRules(read('src/components/shell/Shell/Shell.module.css'))
const composeSource = read(
  'src/modules/packages/application/composeToolDocument.ts',
)
const shellStyles = composeSource.match(/const SHELL_STYLES = `([\s\S]*?)`/)![1]
const doc = parseRules(shellStyles)

describe('SHELL_STYLES sigue al shell de la home', () => {
  const pairs = [...home].filter(
    ([selector]) => ![...HOME_ONLY].some((own) => selector === own),
  )

  it('hay reglas que comparar', () => {
    expect(pairs.length).toBeGreaterThan(8)
  })

  for (const [selector, homeDeclarations] of pairs) {
    const docSelector = normalizeSelector(toDocSelector(selector))

    it(`${selector} → ${docSelector}`, () => {
      const docDeclarations = doc.get(docSelector)
      expect(docDeclarations, `falta la regla ${docSelector}`).toBeDefined()

      const allowed = KNOWN_DIFFERENCES[docSelector] ?? []
      const compare = (declarations: Map<string, string>) =>
        Object.fromEntries(
          [...declarations]
            .filter(([property]) => !allowed.includes(property))
            .map(([property, value]) => [property, resolveVars(value)]),
        )

      expect(compare(docDeclarations!)).toEqual(compare(homeDeclarations))
    })
  }
})
