import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * El CI (.github/workflows/ci.yml) no se puede ejecutar aquí, pero sí se
 * puede vigilar lo que suele romperse en silencio: que los scripts de npm que
 * llama existan, que las acciones sigan fijadas por SHA y que el build no
 * lleve secretos. El resto lo cubre docs/operaciones/ci.md.
 */

const root = process.cwd()
const read = (rel: string) =>
  readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n')

const workflow = read('.github/workflows/ci.yml')
const pkg = JSON.parse(read('package.json')) as {
  scripts: Record<string, string>
}

describe('flujo de CI', () => {
  it('cada `npm run <script>` del flujo existe en package.json', () => {
    const used = [...workflow.matchAll(/npm run ([\w:-]+)/g)].map((m) => m[1])

    expect(used.length).toBeGreaterThan(0)
    for (const name of used) {
      expect(pkg.scripts, `falta el script «${name}»`).toHaveProperty(name)
    }
  })

  it('lanza lint, typecheck, test, build y audit', () => {
    for (const cmd of [
      'npm run lint',
      'npm run typecheck',
      'npm test',
      'npm run build',
      'npm audit --omit=dev --audit-level=high',
    ]) {
      expect(workflow, cmd).toContain(cmd)
    }
  })

  it('toda acción externa va fijada por SHA de 40 caracteres, con su versión en comentario', () => {
    const uses = [...workflow.matchAll(/^\s*- uses: (\S+)(.*)$/gm)]

    expect(uses.length).toBeGreaterThan(0)
    for (const [, ref, rest] of uses) {
      expect(ref, ref).toMatch(/^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/)
      expect(rest, ref).toMatch(/# v\d/)
    }
  })

  it('el Node sale de .nvmrc, que existe y coincide con `engines`', () => {
    expect(workflow).toContain('node-version-file: .nvmrc')
    expect(existsSync(join(root, '.nvmrc'))).toBe(true)

    const nvmrc = read('.nvmrc').trim()
    const engines = (
      JSON.parse(read('package.json')) as { engines: { node: string } }
    ).engines.node
    const min = engines.match(/>=\s*(\d+\.\d+\.\d+)/)?.[1]
    const major = engines.match(/<\s*(\d+)\./)?.[1]

    expect(min, 'engines.node debería llevar «>=x.y.z»').toBeDefined()
    expect(nvmrc.startsWith(`${Number(major) - 1}.`)).toBe(true)
    expect(nvmrc >= (min as string)).toBe(true)
  })

  it('el build usa solo valores de relleno para las variables obligatorias (src/lib/env.ts), sin secretos reales', () => {
    // Nada sale de los secretos del repositorio.
    expect(workflow).not.toMatch(/secrets\./)
    // Las únicas variables de servidor son las que exige env.ts, con relleno.
    expect(workflow).not.toMatch(
      /API_SECRET|SMTP_PASSWORD|MAILCHIMP|CLOUDMERSIVE/,
    )
    expect(workflow).toMatch(/SUPABASE_SECRET_KEY: sb_secret_ci_placeholder/)
    for (const name of [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SITE_URL',
      'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
    ]) {
      expect(workflow, name).toContain(name)
    }
  })

  it('los permisos por defecto son de solo lectura', () => {
    expect(workflow).toMatch(/^permissions:\n {2}contents: read$/m)
  })
})
