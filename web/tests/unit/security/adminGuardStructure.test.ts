import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Tests estructurales de la superficie de escritura (SEC-T1, SEC-T2).
 *
 * Una Server Action es un endpoint POST público: que cuelgue de /admin no
 * la protege, solo la protege su propia comprobación de sesión. Estos tests
 * leen el código fuente y fallan si alguien añade una acción o una ruta de
 * administración sin guard, o si el guard deja de ser lo primero que ocurre.
 */

const SRC = path.join(process.cwd(), 'src')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)

    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

function read(file: string): string {
  return readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
}

function rel(file: string): string {
  return path.relative(process.cwd(), file).split(path.sep).join('/')
}

const USE_SERVER = /^(['"])use server\1/m

/** Cuerpo de cada `export async function` del fichero, por nombre. */
function exportedFunctions(source: string): Map<string, string> {
  const matches = [...source.matchAll(/^export async function (\w+)\(/gm)]

  return new Map(
    matches.map((match, index) => {
      const end = matches[index + 1]?.index ?? source.length

      return [match[1], source.slice(match.index + match[0].length, end)]
    }),
  )
}

const ACTION_GUARD = /await\s+(isAdminRequest|getAdminActor)\(/

/**
 * Acciones de admin sin guard a propósito. `signOutAction` solo destruye la
 * sesión de quien la llama: pedirle sesión de admin dejaría atrapado a un
 * usuario autenticado que ya no es admin.
 */
const UNGUARDED_ADMIN_ACTIONS = new Set(['signOutAction'])

/** Ficheros de Server Actions fuera de /admin: lista cerrada y pública a propósito. */
const PUBLIC_ACTION_FILES = new Set([
  'src/app/(public)/contact/contactActions.ts',
  'src/app/_actions/newsletterActions.ts',
])

const serverActionFiles = walk(SRC)
  .filter((file) => /\.tsx?$/.test(file))
  .filter((file) => USE_SERVER.test(read(file)))

describe('SEC-T1: Server Actions', () => {
  it('encuentra las Server Actions del proyecto', () => {
    expect(serverActionFiles.length).toBeGreaterThan(10)
  })

  it('las que no están bajo /admin son una lista cerrada y conocida', () => {
    const outsideAdmin = serverActionFiles
      .map(rel)
      .filter((file) => !file.startsWith('src/app/admin/'))

    expect(new Set(outsideAdmin)).toEqual(PUBLIC_ACTION_FILES)
  })

  const adminFiles = serverActionFiles
    .map(rel)
    .filter((file) => file.startsWith('src/app/admin/'))

  it.each(adminFiles)(
    '%s: cada acción exportada empieza por el guard de admin',
    (file) => {
      const functions = exportedFunctions(read(path.join(process.cwd(), file)))

      expect(functions.size).toBeGreaterThan(0)

      for (const [name, body] of functions) {
        if (UNGUARDED_ADMIN_ACTIONS.has(name)) continue

        const signatureEnd = body.search(/\)\s*:\s*Promise|\)\s*\{/)
        const afterSignature = body.slice(Math.max(signatureEnd, 0))
        const firstAwait = afterSignature.match(/await\s+(\w+)\(?/)

        expect(
          ACTION_GUARD.test(body),
          `${file} → ${name} no llama a isAdminRequest/getAdminActor`,
        ).toBe(true)

        expect(
          firstAwait?.[1],
          `${file} → ${name}: el guard debe ser lo primero que se espera`,
        ).toMatch(/^(isAdminRequest|getAdminActor)$/)
      }
    },
  )

  it('la lista de excepciones no contiene acciones que ya no existen', () => {
    const existing = new Set(
      adminFiles.flatMap((file) => [
        ...exportedFunctions(read(path.join(process.cwd(), file))).keys(),
      ]),
    )

    for (const name of UNGUARDED_ADMIN_ACTIONS) {
      expect(existing.has(name), `${name} ya no existe`).toBe(true)
    }
  })
})

describe('SEC-T2: rutas de /api/admin', () => {
  const adminRoutes = walk(path.join(SRC, 'app/api/admin')).filter((file) =>
    /route\.ts$/.test(file),
  )

  it('encuentra las rutas de administración', () => {
    expect(adminRoutes.length).toBeGreaterThan(0)
  })

  it.each(adminRoutes.map(rel))(
    '%s: cada método HTTP llama a adminApiGuard antes de nada',
    (file) => {
      const source = read(path.join(process.cwd(), file))
      const handlers = [
        ...source.matchAll(
          /^export async function (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\(/gm,
        ),
      ]

      expect(handlers.length).toBeGreaterThan(0)

      handlers.forEach((match, index) => {
        const end = handlers[index + 1]?.index ?? source.length
        const body = source.slice(match.index + match[0].length, end)
        const firstAwait = body.match(/await\s+(\w+)\(/)

        expect(
          firstAwait?.[1],
          `${file} → ${match[1]}: adminApiGuard debe ser lo primero que se espera`,
        ).toBe('adminApiGuard')
      })
    },
  )
})

describe('SEC-ADM-A2: páginas que leen datos sin RLS', () => {
  const talentPages = walk(path.join(SRC, 'app/admin/(panel)/talent')).filter(
    (file) => /page\.tsx$/.test(file),
  )

  it('encuentra las páginas de talent', () => {
    expect(talentPages.length).toBeGreaterThanOrEqual(3)
  })

  it.each(talentPages.map(rel))(
    '%s: comprueba la sesión de admin antes de leer nada',
    (file) => {
      const source = read(path.join(process.cwd(), file))
      const body = source.slice(source.indexOf('export default'))

      expect(body.match(/await\s+(\w+)\(/)?.[1], file).toBe('requireAdminPage')
    },
  )
})
