import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * `vercel.json`: Vercel no debe compilar las ramas de Dependabot. Las PR de
 * dependencias ya pasan por el CI de GitHub (instalación, lint, tipos, tests
 * y build) y una preview que falla en Vercel solo añade un error rojo sin
 * información nueva. En `ignoreCommand`, salir con 0 SALTA el despliegue y
 * salir con 1 lo hace.
 */

const config = JSON.parse(
  readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'),
) as { ignoreCommand?: string; regions?: string[] }

function exitCodeFor(ref: string | undefined): number | null {
  const env = { ...process.env }
  delete env.VERCEL_GIT_COMMIT_REF
  if (ref !== undefined) env.VERCEL_GIT_COMMIT_REF = ref

  return spawnSync('bash', ['-c', config.ignoreCommand as string], { env })
    .status
}

describe('vercel.json — ignoreCommand', () => {
  it('existe', () => {
    expect(typeof config.ignoreCommand).toBe('string')
  })

  it.each([
    'dependabot/npm_and_yarn/menores-y-parches-d8b6e3f1a2',
    'dependabot/npm_and_yarn/vitest-5.0.5',
    'dependabot/github_actions/acciones-1a2b3c',
  ])('salta el despliegue de la rama %s', (ref) => {
    expect(exitCodeFor(ref)).toBe(0)
  })

  it.each([
    'main',
    'master',
    'feature/dependabot-config',
    'fix/mi-rama',
    'dependabotx/rama',
  ])('despliega la rama %s', (ref) => {
    expect(exitCodeFor(ref)).toBe(1)
  })

  it('despliega si no hay rama (despliegue desde la CLI)', () => {
    expect(exitCodeFor(undefined)).toBe(1)
    expect(exitCodeFor('')).toBe(1)
  })
})
