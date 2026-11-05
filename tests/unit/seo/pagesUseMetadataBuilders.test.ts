import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Next fusiona los metadatos de forma superficial: una página que declare los
 * suyos a mano pierde la canónica y la imagen por defecto sin que ningún test
 * de comportamiento lo note. Este test lee el código y exige que toda página
 * pública con metadatos pase por un constructor compartido.
 */
function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return pages(path)
    return name === 'page.tsx' ? [path] : []
  })
}

const root = join(process.cwd(), 'src', 'app', '(public)')
const files = pages(root)

const DECLARES = /export (const metadata\b|async function generateMetadata\b)/
const BUILDERS = /build(PageMetadata|ContentMetadata|WorkMetadata)\(/

describe('metadatos de las páginas públicas', () => {
  it('hay páginas que vigilar', () => {
    expect(files.length).toBeGreaterThan(8)
  })

  it('la detección separa una página con metadatos a mano de una con constructor', () => {
    expect(DECLARES.test("export const metadata = { title: 'x' }")).toBe(true)
    expect(BUILDERS.test("export const metadata = { title: 'x' }")).toBe(false)
    expect(BUILDERS.test('export const metadata = buildPageMetadata({')).toBe(
      true,
    )
  })

  it.each(
    files
      .map(
        (file) => [relative(root, file), readFileSync(file, 'utf8')] as const,
      )
      .filter(([, source]) => DECLARES.test(source)),
  )('%s usa un constructor de metadatos', (_name, source) => {
    expect(source).toMatch(BUILDERS)
  })

  it('las páginas fijas pasan `path` (canónica) a buildPageMetadata', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      if (!/buildPageMetadata\(\{/.test(source)) continue

      expect(source, relative(root, file)).toMatch(/\bpath: '\//)
    }
  })
})
