import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { buildE2eEnv } from '@root/scripts/e2e-env.mjs'

/**
 * Los E2E (docs/operaciones/e2e.md) no se pueden ejecutar aquí (necesitan
 * Docker), pero sí se vigila lo que se puede romper sin que nadie lo note: el
 * flujo, las variables de prueba, la configuración de Supabase y el seed.
 */

const root = process.cwd()
const read = (rel: string) =>
  readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n')

const workflow = read('.github/workflows/e2e.yml')
const pkg = JSON.parse(read('package.json')) as {
  scripts: Record<string, string>
  devDependencies: Record<string, string>
}

describe('flujo E2E', () => {
  it('`e2e/` queda fuera del tsconfig de la web y tiene el suyo en `typecheck`', () => {
    // Si next build compilara e2e/, el build fallaría en cualquier máquina sin
    // @playwright/test instalado (devDependency).
    const root = JSON.parse(read('tsconfig.json')) as { exclude: string[] }
    expect(root.exclude).toContain('e2e')
    expect(existsSync(join(process.cwd(), 'e2e/tsconfig.json'))).toBe(true)
    expect(pkg.scripts.typecheck).toContain('tsc --noEmit -p e2e/tsconfig.json')
  })

  it('cada `npm run <script>` del flujo existe en package.json', () => {
    const used = [...workflow.matchAll(/npm run ([\w:-]+)/g)].map((m) => m[1])
    expect(used).toContain('e2e')
    for (const name of used) {
      expect(pkg.scripts, `falta el script «${name}»`).toHaveProperty(name)
    }
  })

  it('solo corre de noche y a mano: ni en cada subida ni en cada pull request', () => {
    expect(workflow).toMatch(/^ {2}schedule:/m)
    expect(workflow).toMatch(/^ {2}workflow_dispatch:/m)
    expect(workflow).not.toMatch(/^ {2}pull_request/m)
    expect(workflow).not.toMatch(/^ {2}push:/m)
  })

  it('toda acción externa va fijada por SHA de 40 caracteres, con su versión en comentario', () => {
    const uses = [...workflow.matchAll(/uses: (\S+)(.*)/g)]
    expect(uses.length).toBeGreaterThan(0)
    for (const [, ref, rest] of uses) {
      expect(ref, ref).toMatch(/^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/)
      expect(rest, ref).toMatch(/# v\d/)
    }
  })

  it('Node sale de .nvmrc, sin secretos y con permisos de solo lectura', () => {
    expect(workflow).toContain('node-version-file: .nvmrc')
    expect(workflow).not.toMatch(/secrets\./)
    expect(workflow).toMatch(/^permissions:\n {2}contents: read$/m)
  })

  it('el orden es: Supabase, variables, build y tests', () => {
    const order = [
      'supabase start',
      'node scripts/e2e-env.mjs >> "$GITHUB_ENV"',
      'npm run build',
      'npm run e2e',
    ].map((step) => workflow.indexOf(step))

    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('@playwright/test y playwright están en la misma versión', () => {
    const runner = pkg.devDependencies['@playwright/test']
    const installed = JSON.parse(
      readFileSync(
        join(root, 'node_modules', 'playwright', 'package.json'),
        'utf8',
      ),
    ).version as string

    expect(runner).toMatch(/^\d+\.\d+\.\d+$/)
    expect(installed).toBe(runner)
  })
})

describe('variables de prueba de los E2E', () => {
  const env = buildE2eEnv({
    url: 'http://127.0.0.1:54321',
    publishableKey: 'pub',
    secretKey: 'sec',
  }) as Record<string, string>

  it('incluyen lo que exige env.ts y lo obligatorio en producción (serverEnv.ts)', () => {
    for (const name of [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_SECRET_KEY',
      'NEXT_PUBLIC_SITE_URL',
      'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
      'APP_SIGNING_SECRET',
      'CONTACT_IP_HASH_SALT',
      'CONTACT_SMTP_HOST',
      'CONTACT_SMTP_PORT',
      'CONTACT_SMTP_USER',
      'CONTACT_SMTP_PASSWORD',
      'CONTACT_EMAIL_TO',
      'CONTACT_EMAIL_FROM',
    ]) {
      expect(env[name], name).toBeTruthy()
    }
  })

  it('cumplen las reglas de producción: firma de 32 o más, sal de 16 o más y distinta de las de ejemplo', () => {
    expect(env.APP_SIGNING_SECRET.length).toBeGreaterThanOrEqual(32)
    expect(env.CONTACT_IP_HASH_SALT.length).toBeGreaterThanOrEqual(16)
    expect(env.CONTACT_IP_HASH_SALT).not.toBe('greener-dev-salt')
    expect(env.CONTACT_IP_HASH_SALT).not.toBe(
      'fija-una-sal-propia-para-produccion',
    )
  })

  it('la web se sirve en http://localhost:3000, como el baseURL de Playwright', () => {
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000')
    expect(read('e2e/playwright.config.ts')).toContain('const PORT = 3000')
  })
})

describe('Supabase local de los E2E', () => {
  const config = read('supabase/config.toml')

  it('usa la versión de PostgreSQL de producción (17)', () => {
    expect(config).toMatch(/^major_version = 17$/m)
  })

  it('aplica los dos seeds y existen', () => {
    expect(config).toMatch(
      /sql_paths = \["\.\/seed\.sql", "\.\/seed_demo_data\.sql"\]/,
    )
    expect(existsSync(join(root, 'supabase/seed.sql'))).toBe(true)
    expect(existsSync(join(root, 'supabase/seed_demo_data.sql'))).toBe(true)
  })

  it('el seed de demo no usa columnas que las migraciones ya borraron', () => {
    const seed = read('supabase/seed_demo_data.sql')
    expect(seed).not.toContain('show_as_carousel')
    expect(seed).not.toContain('speed_ms')
    // case_detail_media.alt es obligatorio desde 20260914090000.
    expect(seed).not.toMatch(
      /insert into case_detail_media \(content_id, media_id, sort_order\)/,
    )
  })

  it('la tabla admin_allowed_domain se crea antes de la migración que la usa', () => {
    const creator = ['20260806090600_admin_access.sql']
    const user = '20260806090700_rls_policies.sql'
    for (const file of creator) {
      expect(read(`supabase/migrations/${file}`)).toContain(
        'create table if not exists admin_allowed_domain',
      )
      expect(file < user).toBe(true)
    }
  })
})
