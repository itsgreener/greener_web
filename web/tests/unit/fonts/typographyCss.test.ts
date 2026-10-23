import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const globalsCss = readFileSync(join(ROOT, 'src/app/globals.css'), 'utf8')

/** Cuerpo de la primera regla cuyo selector es exactamente `selector`. */
function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(
    new RegExp(`(?:^|[}/])\\s*${escaped}\\s*\\{([^}]*)\\}`),
  )
  return match ? match[1] : ''
}

describe('tipografías — CSS global', () => {
  it('.text-display fuerza peso 400 y sin negrita sintética (Kinder solo tiene Regular)', () => {
    const body = ruleBody(globalsCss, '.text-display')

    expect(body).toContain('font-family: var(--font-display)')
    expect(body).toMatch(/font-weight:\s*400/)
    expect(body).toMatch(/font-synthesis:\s*none/)
  })

  it('.text-body usa la fuente de cuerpo, sin ancho máximo, con el tamaño y la altura de línea del pin', () => {
    const body = ruleBody(globalsCss, '.text-body')
    const pinLabel = readFileSync(
      join(ROOT, 'src/components/pin/PinCard/PinCard.module.css'),
      'utf8',
    )
    const label = ruleBody(pinLabel, '.label')

    expect(body).toContain('font-family: var(--font-body)')
    expect(body).toMatch(/font-weight:\s*400/)
    expect(body).not.toMatch(/max-width/)
    // Mismo cuerpo que el texto bajo cada pin (.label).
    expect(body).toMatch(/font-size:\s*var\(--fs-sm\)/)
    expect(label).toMatch(/font-size:\s*var\(--fs-sm\)/)
    expect(body.match(/line-height:\s*[\d.]+/)?.[0]).toBe(
      label.match(/line-height:\s*[\d.]+/)?.[0],
    )
  })

  it('el body usa --font-body, que parte de Helvetica Neue', () => {
    expect(ruleBody(globalsCss, 'body')).toContain(
      'font-family: var(--font-body)',
    )
    expect(globalsCss).toMatch(/--font-body:[^;]*var\(--font-helvetica-neue\)/)
  })

  it('--font-display parte de Kinder', () => {
    expect(globalsCss).toMatch(/--font-display:[^;]*var\(--font-kinder\)/)
  })

  it('los ficheros WOFF2 que declara src/lib/fonts.ts existen', () => {
    const fontsTs = readFileSync(join(ROOT, 'src/lib/fonts.ts'), 'utf8')
    const paths = [...fontsTs.matchAll(/path:\s*'\.\.\/fonts\/([^']+)'/g)].map(
      (m) => m[1],
    )

    expect(paths.length).toBe(3)
    for (const file of paths) {
      expect(existsSync(join(ROOT, 'src/fonts', file)), file).toBe(true)
    }
  })

  it('ningún módulo CSS escribe un nombre de fuente a mano: usan las variables globales', () => {
    // Convención §24.1: los módulos consumen var(--font-*), no redefinen.
    const modules = (
      readdirSync(join(ROOT, 'src'), { recursive: true }) as string[]
    ).filter((file) => file.endsWith('.module.css'))

    expect(modules.length).toBeGreaterThan(0)
    for (const file of modules) {
      const css = readFileSync(join(ROOT, 'src', file), 'utf8')
      expect(css, file).not.toMatch(/font-family:\s*['"]?(Helvetica|Kinder)/)
      // Tampoco una fuente genérica a mano (Arial, sans-serif…): solo
      // var(--font-*), var(--admin-font-*) o `inherit`.
      for (const [, value] of css.matchAll(/font-family:\s*([^;]+);/g)) {
        expect(value.trim(), file).toMatch(
          /^(var\(--(admin-)?font-[\w-]+\)|inherit)$/,
        )
      }
    }
  })
})
