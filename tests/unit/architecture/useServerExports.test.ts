import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Next rompe la build si un fichero `'use server'` exporta algo que no sea
 * una función async (8 oct 2026: una constante en newsletterActions.ts).
 * Vitest no lo detecta, así que lo vigila este test leyendo el código.
 */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

const FORBIDDEN_EXPORT =
  /^export\s+(?:const|let|var|class|enum|default)\b|^export\s+\{/m

function read(path: string) {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
}

describe("ficheros 'use server'", () => {
  const files = sourceFiles(join(process.cwd(), 'src')).filter((path) =>
    /^\s*(['"])use server\1/.test(read(path)),
  )

  it('hay ficheros que vigilar', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it('el patrón detecta una constante exportada', () => {
    expect("'use server'\nexport const A = 1").toMatch(FORBIDDEN_EXPORT)
    expect("'use server'\nexport async function a() {}").not.toMatch(
      FORBIDDEN_EXPORT,
    )
    expect("'use server'\nexport type A = { a: 1 }").not.toMatch(
      FORBIDDEN_EXPORT,
    )
  })

  it.each(files.map((path) => [path.replace(process.cwd(), '')]))(
    '%s solo exporta funciones async (y tipos)',
    (relative) => {
      expect(read(join(process.cwd(), relative))).not.toMatch(FORBIDDEN_EXPORT)
    },
  )
})
