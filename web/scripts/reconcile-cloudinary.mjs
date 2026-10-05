#!/usr/bin/env node
/**
 * Reconciliador de Cloudinary (5 oct 2026).
 *
 * Compara lo que HAY en Cloudinary (`greener/content/**`, imágenes y vídeos)
 * con lo que Postgres conoce (`media_asset.cloudinary_public_id`) y lista —o
 * borra— los archivos que no tiene registrados nadie. Cubre lo que la
 * limpieza automática de la app no puede: una pestaña cerrada a medias de
 * una subida, un fallo de Cloudinary al borrar, y la basura histórica que ya
 * se había acumulado antes de que existiera esa limpieza.
 *
 * Con el plan Free de Cloudinary no se puede dejar esto crecer.
 *
 * USO (desde la raíz del repo, con las variables del `.env.local` de la app):
 *
 *   node --env-file=.env.local scripts/reconcile-cloudinary.mjs            # simulación
 *   node --env-file=.env.local scripts/reconcile-cloudinary.mjs --delete   # borra de verdad
 *
 * OPCIONES
 *   --delete               Borra los huérfanos. Sin esta bandera NUNCA borra.
 *   --min-age-hours=N      Ignora archivos con menos de N horas (por defecto 1):
 *                          una subida en curso ya está en Cloudinary pero aún
 *                          no se ha registrado, y borrarla rompería la subida.
 *   --prefix=RUTA          Prefijo a revisar (por defecto `greener/content/`).
 *                          Nunca se mira nada fuera de `greener/content/`.
 *
 * VARIABLES: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY,
 * NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
 * La clave secreta de Supabase salta RLS: ejecútalo solo desde tu máquina o
 * el servidor, nunca desde el navegador.
 */

import { pathToFileURL } from 'node:url'

export const MANAGED_PREFIX = 'greener/content/'
export const DEFAULT_MIN_AGE_HOURS = 1

/**
 * Lógica pura (la que se testea): de la lista de archivos de Cloudinary y
 * del conjunto de public ids registrados en Postgres, devuelve los huérfanos
 * que se pueden borrar sin riesgo.
 *
 * Un archivo NO es huérfano (no se toca) si:
 *  - su public id está registrado en `media_asset`;
 *  - está fuera de `greener/content/` (nunca se toca nada ajeno);
 *  - es más reciente que `minAgeMs` (puede ser una subida en curso), o no se
 *    puede saber su antigüedad (sin `created_at` válido: ante la duda, no).
 */
export function findOrphanAssets({
  assets,
  registeredPublicIds,
  now = Date.now(),
  minAgeMs = DEFAULT_MIN_AGE_HOURS * 60 * 60 * 1000,
}) {
  const registered =
    registeredPublicIds instanceof Set
      ? registeredPublicIds
      : new Set(registeredPublicIds)

  return assets.filter((asset) => {
    if (!asset.publicId.startsWith(MANAGED_PREFIX)) return false
    if (registered.has(asset.publicId)) return false

    const created = Date.parse(asset.createdAt)
    if (Number.isNaN(created)) return false

    return now - created >= minAgeMs
  })
}

function parseArgs(argv) {
  const options = {
    apply: false,
    minAgeHours: DEFAULT_MIN_AGE_HOURS,
    prefix: MANAGED_PREFIX,
  }

  for (const arg of argv) {
    if (arg === '--delete') options.apply = true
    else if (arg.startsWith('--min-age-hours=')) {
      const value = Number(arg.split('=')[1])
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`--min-age-hours no es válido: ${arg}`)
      }
      options.minAgeHours = value
    } else if (arg.startsWith('--prefix=')) {
      options.prefix = arg.split('=')[1]
    } else {
      throw new Error(`Opción desconocida: ${arg}`)
    }
  }

  if (!options.prefix.startsWith(MANAGED_PREFIX)) {
    throw new Error(`--prefix debe empezar por ${MANAGED_PREFIX}`)
  }

  return options
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

async function listCloudinaryAssets(cloudinary, prefix) {
  const assets = []

  for (const resourceType of ['image', 'video']) {
    let cursor

    do {
      const page = await cloudinary.api.resources({
        resource_type: resourceType,
        type: 'upload',
        prefix,
        max_results: 500,
        next_cursor: cursor,
      })

      for (const resource of page.resources ?? []) {
        assets.push({
          publicId: resource.public_id,
          resourceType,
          bytes: resource.bytes ?? 0,
          createdAt: resource.created_at,
        })
      }

      cursor = page.next_cursor
    } while (cursor)
  }

  return assets
}

async function listRegisteredPublicIds(supabase) {
  const ids = new Set()
  const pageSize = 1000

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('media_asset')
      .select('cloudinary_public_id')
      .range(from, from + pageSize - 1)

    if (error) throw new Error(`Supabase: ${error.message}`)

    for (const row of data ?? []) ids.add(row.cloudinary_public_id)

    if (!data || data.length < pageSize) break
  }

  return ids
}

function formatMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  const { v2: cloudinary } = await import('cloudinary')
  const { createClient } = await import('@supabase/supabase-js')

  cloudinary.config({
    cloud_name: requireEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME'),
    api_key: requireEnv('CLOUDINARY_API_KEY'),
    api_secret: requireEnv('CLOUDINARY_API_SECRET'),
  })

  const supabase = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SECRET_KEY'),
    { auth: { persistSession: false } },
  )

  console.log(
    `Modo: ${options.apply ? 'BORRAR' : 'simulación (no se borra nada)'} · prefijo ${options.prefix} · antigüedad mínima ${options.minAgeHours} h`,
  )

  const [assets, registered] = await Promise.all([
    listCloudinaryAssets(cloudinary, options.prefix),
    listRegisteredPublicIds(supabase),
  ])

  const orphans = findOrphanAssets({
    assets,
    registeredPublicIds: registered,
    minAgeMs: options.minAgeHours * 60 * 60 * 1000,
  })

  const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0)
  const orphanBytes = orphans.reduce((sum, asset) => sum + asset.bytes, 0)

  console.log(
    `Cloudinary: ${assets.length} archivos (${formatMb(totalBytes)}) · Postgres: ${registered.size} registrados`,
  )
  console.log(`Huérfanos: ${orphans.length} (${formatMb(orphanBytes)})`)

  for (const orphan of orphans) {
    console.log(
      `  ${orphan.resourceType.padEnd(5)} ${formatMb(orphan.bytes).padStart(10)}  ${orphan.publicId}  (${orphan.createdAt})`,
    )
  }

  if (orphans.length === 0) return

  if (!options.apply) {
    console.log('\nSimulación: no se ha borrado nada. Repite con --delete.')
    return
  }

  let deleted = 0
  let failed = 0

  for (const resourceType of ['image', 'video']) {
    const ids = orphans
      .filter((orphan) => orphan.resourceType === resourceType)
      .map((orphan) => orphan.publicId)

    // La Admin API admite hasta 100 public ids por llamada.
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100)

      const result = await cloudinary.api.delete_resources(batch, {
        resource_type: resourceType,
        type: 'upload',
        invalidate: true,
      })

      for (const id of batch) {
        const outcome = result.deleted?.[id]
        if (outcome === 'deleted' || outcome === 'not_found') deleted += 1
        else {
          failed += 1
          console.error(
            `  No se pudo borrar ${id}: ${outcome ?? 'sin respuesta'}`,
          )
        }
      }
    }
  }

  console.log(`\nBorrados: ${deleted} · Fallidos: ${failed}`)

  if (failed > 0) process.exitCode = 1
}

// Solo se ejecuta al lanzarlo con `node`, no al importarlo desde un test.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
