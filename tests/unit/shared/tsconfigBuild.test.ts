import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * `next build` comprueba tipos con el tsconfig que le indica next.config.ts.
 * Tiene que ser el de `src/`: si compilara también `tests/` y `e2e/`, la build
 * de producción dependería de vitest y de @playwright/test (fallaba en
 * cualquier máquina sin esas dependencias instaladas) y tardaría más. Los tipos
 * de tests y E2E los comprueba `npm run typecheck`.
 */

const root = process.cwd()
const read = (rel: string) =>
  readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n')

type TsConfig = { include?: string[]; exclude?: string[]; extends?: string }
const base = JSON.parse(read('tsconfig.json')) as TsConfig
const build = JSON.parse(read('tsconfig.build.json')) as TsConfig
const pkg = JSON.parse(read('package.json')) as {
  scripts: Record<string, string>
}

describe('tsconfig de la build', () => {
  it('next.config.ts apunta a tsconfig.build.json', () => {
    expect(read('next.config.ts')).toMatch(
      /typescript:\s*\{[^}]*tsconfigPath:\s*'tsconfig\.build\.json'/,
    )
  })

  it('extiende el de la raíz, incluye solo src/ y deja fuera tests y e2e', () => {
    expect(build.extends).toBe('./tsconfig.json')
    expect(build.exclude).toEqual(
      expect.arrayContaining(['node_modules', 'tests', 'e2e']),
    )
    for (const pattern of build.include ?? []) {
      expect(pattern).toMatch(/^(src\/|next-env\.d\.ts|\.next\/types\/)/)
    }
    expect(build.include).toEqual(
      expect.arrayContaining(['src/**/*.ts', 'src/**/*.tsx']),
    )
  })

  it('el tsconfig de la raíz (editor y `npm run typecheck`) sigue incluyendo tests', () => {
    expect(base.include).toContain('**/*.ts')
    expect(base.exclude).not.toContain('tests')
    expect(pkg.scripts.typecheck).toMatch(/tsc --noEmit(?! -p)/)
  })
})
