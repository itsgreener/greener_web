#!/usr/bin/env node
// Variables de entorno para compilar y servir la web contra el Supabase local
// de los E2E (docs/operaciones/e2e.md). Imprime líneas `CLAVE=valor`, que es
// el formato de $GITHUB_ENV:
//
//   node scripts/e2e-env.mjs >> "$GITHUB_ENV"
//
// Las claves y la URL salen de `supabase status -o json` (la CLI tiene que
// estar en el PATH y `supabase start` ya ejecutado). Se pueden fijar a mano
// con E2E_SUPABASE_URL, E2E_SUPABASE_PUBLISHABLE_KEY y E2E_SUPABASE_SECRET_KEY
// (para probar contra otro backend). El resto son valores de prueba: ningún
// secreto real y nada que salga a internet.

import { spawnSync } from 'node:child_process'

/** Puerto del receptor SMTP de prueba (e2e/support/smtpSink.ts). */
export const E2E_SMTP_PORT = 2525

/** Primera clave del estado de Supabase que coincida con alguno de los nombres. */
function pick(status, names) {
  for (const name of names) {
    const value = status[name]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return undefined
}

function readSupabaseStatus() {
  const bin = process.env.SUPABASE_BIN ?? 'supabase'
  const result = spawnSync(bin, ['status', '-o', 'json'], {
    encoding: 'utf8',
  })

  if (result.error || result.status !== 0) {
    throw new Error(
      `No se pudo ejecutar «${bin} status -o json» (¿está la CLI en el PATH y se ha hecho \`supabase start\`?):\n` +
        `${result.error?.message ?? ''}${result.stderr ?? ''}`,
    )
  }

  // La CLI puede escribir avisos antes del JSON: se coge desde la primera llave.
  const start = result.stdout.indexOf('{')
  return JSON.parse(result.stdout.slice(start))
}

export function resolveSupabase(env = process.env) {
  const overridden =
    env.E2E_SUPABASE_URL &&
    env.E2E_SUPABASE_PUBLISHABLE_KEY &&
    env.E2E_SUPABASE_SECRET_KEY

  if (overridden) {
    return {
      url: env.E2E_SUPABASE_URL,
      publishableKey: env.E2E_SUPABASE_PUBLISHABLE_KEY,
      secretKey: env.E2E_SUPABASE_SECRET_KEY,
    }
  }

  const status = readSupabaseStatus()
  const url = pick(status, ['API_URL', 'SUPABASE_URL'])
  const publishableKey = pick(status, [
    'PUBLISHABLE_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'ANON_KEY',
    'SUPABASE_ANON_KEY',
  ])
  const secretKey = pick(status, [
    'SECRET_KEY',
    'SUPABASE_SECRET_KEY',
    'SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ])

  if (!url || !publishableKey || !secretKey) {
    throw new Error(
      'Faltan la URL o las claves en `supabase status -o json`. Claves recibidas: ' +
        Object.keys(status).join(', '),
    )
  }

  return { url, publishableKey, secretKey }
}

export function buildE2eEnv(supabase) {
  return {
    NEXT_PUBLIC_SUPABASE_URL: supabase.url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
    SUPABASE_SECRET_KEY: supabase.secretKey,
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'e2e',
    // Obligatorias en producción (serverEnv.ts): valores de prueba.
    APP_SIGNING_SECRET: 'e2e-signing-secret-only-for-tests-0123456789',
    CONTACT_IP_HASH_SALT: 'e2e-ip-hash-salt-only-for-tests',
    // Contacto: SMTP de prueba en el propio runner.
    CONTACT_SMTP_HOST: '127.0.0.1',
    CONTACT_SMTP_PORT: String(E2E_SMTP_PORT),
    CONTACT_SMTP_SECURE: 'false',
    CONTACT_SMTP_USER: 'e2e',
    CONTACT_SMTP_PASSWORD: 'e2e',
    CONTACT_EMAIL_TO: 'hi@e2e.test',
    CONTACT_EMAIL_FROM: 'no-reply@e2e.test',
    NEXT_TELEMETRY_DISABLED: '1',
  }
}

// Solo al ejecutarlo directamente, no al importarlo desde un test.
if (import.meta.url === `file://${process.argv[1]}`) {
  const env = buildE2eEnv(resolveSupabase())
  for (const [key, value] of Object.entries(env)) {
    console.log(`${key}=${value}`)
  }
}
