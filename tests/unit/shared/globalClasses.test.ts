import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const SRC = join(process.cwd(), 'src')
const globalsCss = readFileSync(join(SRC, 'app/globals.css'), 'utf8')
// Sin comentarios: una clase solo mencionada en un comentario no está definida.
const globalsRules = globalsCss.replace(/\/\*[\s\S]*?\*\//g, '')

/** Clases que se escriben como texto en un TSX: className="a b". */
function literalClasses(): Map<string, string[]> {
  const found = new Map<string, string[]>()
  const files = (readdirSync(SRC, { recursive: true }) as string[]).filter(
    (file) => file.endsWith('.tsx'),
  )

  for (const file of files) {
    const source = readFileSync(join(SRC, file), 'utf8')
    for (const [, value] of source.matchAll(/className="([^"{}]+)"/g)) {
      for (const name of value.split(/\s+/).filter(Boolean)) {
        found.set(name, [...(found.get(name) ?? []), file])
      }
    }
  }
  return found
}

describe('clases globales', () => {
  it('toda clase escrita como texto en un TSX está definida en globals.css', () => {
    // Fue lo que pasó con `text-body` (usada en /contact y perdida del CSS).
    const missing = [...literalClasses()].filter(
      ([name]) => !new RegExp(`\\.${name}(?![\\w-])`).test(globalsRules),
    )

    expect(missing.map(([name, files]) => `${name} → ${files[0]}`)).toEqual([])
  })

  it('las utilidades de ocultación compartidas existen y no se redefinen en módulos', () => {
    expect(globalsRules).toMatch(/\.visually-hidden\s*\{/)
    expect(globalsRules).toMatch(/\.honeypot\s*\{/)

    const modules = (readdirSync(SRC, { recursive: true }) as string[]).filter(
      (file) => file.endsWith('.module.css'),
    )
    for (const file of modules) {
      const css = readFileSync(join(SRC, file), 'utf8')
      expect(css, file).not.toMatch(/\.(honeypot|srOnly)\s*\{/)
    }
  })
})
