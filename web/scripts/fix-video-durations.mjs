#!/usr/bin/env node
/**
 * Corrector de duraciones de vídeo (8 oct 2026).
 *
 * Hasta el 8 oct, `verifyCloudinaryVideoAsset` rellenaba con un `?? 10` los
 * vídeos cuya duración no devolvía la Admin API (faltaba `image_metadata`).
 * Los flujos de portada «other» y de carrusel de casos guardaban ese 10 tal
 * cual: 27 filas de `media_asset` con 10 s exactos que no eran reales. El
 * código ya no inventa duraciones; este script arregla los datos viejos.
 *
 * QUÉ HACE
 *  Para CADA vídeo de `media_asset` pregunta a la Admin API de Cloudinary
 *  (con `image_metadata: true`) su duración real, la redondea hacia arriba
 *  (la columna es entera, igual que hacen los esquemas de la app) y, si no
 *  coincide con la guardada, la corrige. Mira todos los vídeos, no solo los
 *  de 10 s: un 10 puede ser real.
 *
 * QUÉ NO HACE
 *  - No toca nada sin `--execute`: por defecto lista las diferencias.
 *  - No toca un vídeo si Cloudinary no devuelve duración o no encuentra el
 *    archivo (lo lista aparte).
 *  - No toca nada que no sea `media_asset.duration_seconds`.
 *
 * USO
 *   node --env-file=.env.local scripts/fix-video-durations.mjs
 *   node --env-file=.env.local scripts/fix-video-durations.mjs --execute
 *
 * VARIABLES: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY,
 * NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
 * La Admin API cuenta contra el límite horario de la cuenta (una llamada por
 * vídeo); no consume créditos de transformación.
 */

import { pathToFileURL } from 'node:url'

/**
 * Lógica pura: de las filas y de las duraciones reales (por public id),
 * devuelve las correcciones y los vídeos que no se han podido comprobar.
 *
 * @param {{
 *   rows: Array<{ id: string, publicId: string, durationSeconds: number | null }>,
 *   realDurations: Map<string, number | null | undefined>,
 * }} input
 */
export function planDurationFixes({ rows, realDurations }) {
  const fixes = []
  const unknown = []

  for (const row of rows) {
    const real = realDurations.get(row.publicId)

    if (typeof real !== 'number' || !Number.isFinite(real) || real <= 0) {
      unknown.push(row)
      continue
    }

    const rounded = Math.ceil(real)

    if (rounded !== row.durationSeconds) {
      fixes.push({ ...row, realSeconds: real, newDurationSeconds: rounded })
    }
  }

  return { fixes, unknown }
}

export function parseArgs(argv) {
  const options = { execute: false }

  for (const arg of argv) {
    if (arg === '--execute') options.execute = true
    else throw new Error(`Opción desconocida: ${arg}`)
  }

  return options
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  const { createClient } = await import('@supabase/supabase-js')
  const { v2: cloudinary } = await import('cloudinary')

  const supabase = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SECRET_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  cloudinary.config({
    cloud_name: requireEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME'),
    api_key: requireEnv('CLOUDINARY_API_KEY'),
    api_secret: requireEnv('CLOUDINARY_API_SECRET'),
    secure: true,
  })

  const { data, error } = await supabase
    .from('media_asset')
    .select('id, cloudinary_public_id, duration_seconds')
    .eq('kind', 'video')
    .order('id')

  if (error) throw new Error(`Supabase (media_asset): ${error.message}`)

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    publicId: row.cloudinary_public_id,
    durationSeconds: row.duration_seconds,
  }))

  console.log(`Vídeos en media_asset: ${rows.length}`)

  const realDurations = new Map()

  for (const row of rows) {
    try {
      const resource = await cloudinary.api.resource(row.publicId, {
        resource_type: 'video',
        type: 'upload',
        image_metadata: true,
      })
      realDurations.set(row.publicId, resource.duration)
    } catch (err) {
      realDurations.set(row.publicId, null)
      console.error(`  ${row.publicId}: ${err?.message ?? err}`)
    }
  }

  const { fixes, unknown } = planDurationFixes({ rows, realDurations })

  console.log(`\nDuraciones que no coinciden: ${fixes.length}`)
  for (const fix of fixes) {
    console.log(
      `  ${fix.publicId}: guardada ${fix.durationSeconds} s -> real ${fix.realSeconds} s (se guardará ${fix.newDurationSeconds})`,
    )
  }

  if (unknown.length > 0) {
    console.log(`\nSin poder comprobar (no se tocan): ${unknown.length}`)
    for (const row of unknown) console.log(`  ${row.publicId}`)
  }

  if (!options.execute) {
    console.log('\nSimulación: no se ha cambiado nada. Usa --execute.')
    return
  }

  let updated = 0
  let failed = 0

  for (const fix of fixes) {
    const { error: updateError } = await supabase
      .from('media_asset')
      .update({ duration_seconds: fix.newDurationSeconds })
      .eq('id', fix.id)

    if (updateError) {
      failed += 1
      console.error(`  ${fix.publicId}: ${updateError.message}`)
    } else {
      updated += 1
    }
  }

  console.log(`\nCorregidas: ${updated}. Fallidas: ${failed}.`)
  if (failed > 0) process.exitCode = 1
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
