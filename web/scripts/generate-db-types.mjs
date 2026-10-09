#!/usr/bin/env node
/**
 * Regenera src/lib/supabase/database.types.ts desde el esquema REAL de
 * Supabase. Ejecútalo después de aplicar una migración:
 *
 *   npm run db:types
 *
 * Necesita sesión en la CLI (`npx supabase login`) y el id del proyecto, que
 * se toma de SUPABASE_PROJECT_ID o, si no existe, del subdominio de
 * NEXT_PUBLIC_SUPABASE_URL (https://<id>.supabase.co) en .env.local.
 *
 * Los tipos se escriben solo si la CLI termina bien, y se descarta cualquier
 * texto anterior a `export type Json` (npx imprime ahí sus avisos de
 * instalación).
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const OUTPUT = resolve('src/lib/supabase/database.types.ts')
const HEADER =
  '/**\n' +
  ' * GENERADO con `npm run db:types` a partir del esquema de Supabase. No editar a mano:\n' +
  ' * cualquier cambio se pierde al regenerar. Fuente de verdad: supabase/migrations.\n' +
  ' */\n'

function readEnvLocal() {
  const path = resolve('.env.local')
  if (!existsSync(path)) return {}
  const values = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  return values
}

function resolveProjectId() {
  if (process.env.SUPABASE_PROJECT_ID) return process.env.SUPABASE_PROJECT_ID
  const local = readEnvLocal()
  if (local.SUPABASE_PROJECT_ID) return local.SUPABASE_PROJECT_ID
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? local.NEXT_PUBLIC_SUPABASE_URL
  const match = url ? /^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(url) : null
  return match ? match[1] : null
}

const projectId = resolveProjectId()
if (!projectId) {
  console.error(
    'No encuentro el id del proyecto. Define SUPABASE_PROJECT_ID o NEXT_PUBLIC_SUPABASE_URL.',
  )
  process.exit(1)
}

const result = spawnSync(
  'npx',
  [
    '--yes',
    'supabase',
    'gen',
    'types',
    'typescript',
    '--project-id',
    projectId,
    '--schema',
    'public',
  ],
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
)

if (result.status !== 0) {
  console.error(result.stderr || 'La CLI de Supabase ha fallado.')
  process.exit(result.status ?? 1)
}

const start = result.stdout.indexOf('export type Json')
if (start === -1) {
  console.error('La salida de la CLI no contiene los tipos esperados.')
  process.exit(1)
}

const body = (HEADER + result.stdout.slice(start)).replace(/\r?\n/g, '\r\n')
writeFileSync(OUTPUT, body)
console.log(`Tipos escritos en ${OUTPUT}`)
