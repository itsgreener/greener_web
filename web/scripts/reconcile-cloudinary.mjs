#!/usr/bin/env node
/**
 * Reconciliador de Cloudinary (5 oct 2026).
 *
 * Con el plan Free de Cloudinary no se puede dejar crecer la basura. El
 * script busca DOS tipos de basura y los muestra siempre por separado:
 *
 * 1. ARCHIVOS SIN FILA: están en Cloudinary (`greener/content/**`) pero
 *    ninguna fila de `media_asset` los conoce. Es lo que deja una subida
 *    interrumpida o fallida (pestaña cerrada, error tras subir…).
 *
 * 2. FILAS SIN REFERENCIAS (`--include-unreferenced`): hay fila en
 *    `media_asset`, pero nada la usa: ningún pin (`pin_media`), ningún
 *    carrusel de caso (`case_detail_media`), ninguna portada
 *    (`content.cover_media_id`) ni imagen de compartición
 *    (`content.og_media_id`). Es lo que dejaban `delete_pin` y
 *    `delete_content` antes de la migración 20261005091000, y lo que
 *    quede de cualquier flujo que registre un medio y no lo enlace.
 *
 * QUÉ NO TOCA NUNCA
 *  - Nada de contenido en draft, programado, publicado o DESPUBLICADO: el
 *    estado del contenido no se mira. Un medio cuenta como «en uso» mientras
 *    cuelgue de cualquier pin, carrusel, portada u og, esté el contenido
 *    como esté. Despublicar no borra medios; solo borrarlo del todo lo hace.
 *  - Nada fuera de `greener/content/`.
 *  - Nada con menos de N horas (por defecto 1): puede ser una subida o un
 *    registro en curso. Para las filas cuenta `media_asset.created_at`.
 *  - Una fila que sigue referenciada: las claves foráneas hacia
 *    `media_asset` son NO ACTION, así que Postgres rechaza borrarla aunque
 *    el script se equivocara (o hubiera una referencia nueva entre medias).
 *
 * USO (desde la raíz del repo, con las variables del `.env.local` de la app):
 *
 *   node --env-file=.env.local scripts/reconcile-cloudinary.mjs
 *       Simulación: lista los dos tipos y NO borra nada.
 *
 *   node --env-file=.env.local scripts/reconcile-cloudinary.mjs --delete
 *       Borra solo los archivos sin fila (1).
 *
 *   node --env-file=.env.local scripts/reconcile-cloudinary.mjs --delete --include-unreferenced
 *       Borra también las filas sin referencias y sus archivos (2).
 *
 * OPCIONES
 *   --delete               Borra de verdad. Sin esta bandera NUNCA borra.
 *   --include-unreferenced Con --delete, incluye las filas sin referencias
 *                          (el tipo 2). Sin --delete no cambia nada: la
 *                          simulación ya las muestra siempre.
 *   --min-age-hours=N      Antigüedad mínima en horas (por defecto 1).
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

const HOUR_MS = 60 * 60 * 1000

/**
 * Tipo 1 (lógica pura, la que se testea): de la lista de archivos de
 * Cloudinary y del conjunto de public ids registrados en `media_asset`,
 * devuelve los archivos sin fila que se pueden borrar sin riesgo.
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
  minAgeMs = DEFAULT_MIN_AGE_HOURS * HOUR_MS,
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

/**
 * Tipo 2 (lógica pura): de las filas de `media_asset` y del conjunto de ids
 * que algo referencia (ver listReferencedMediaIds), devuelve las filas que no
 * usa nadie. El ESTADO del contenido no interviene: aquí solo llegan ids de
 * medios referenciados, de contenido en draft, publicado o despublicado.
 *
 * No devuelve una fila si:
 *  - algo la referencia;
 *  - su public id está fuera de `prefix` (por defecto `greener/content/`);
 *  - se registró hace menos de `minAgeMs` (registro en curso), o su
 *    `createdAt` no es una fecha válida.
 *
 * Cada fila devuelta indica si su archivo existe en Cloudinary
 * (`assetExists`) y cuánto pesa allí (`bytes`; 0 si no existe).
 */
/**
 * @typedef {{ id: string, publicId: string, kind: 'image' | 'video', createdAt: string }} MediaRow
 * @typedef {{ publicId: string, resourceType: string, bytes: number, createdAt: string }} CloudinaryAsset
 *
 * @param {{
 *   mediaRows: MediaRow[],
 *   referencedIds: Set<string> | string[],
 *   assets?: CloudinaryAsset[],
 *   now?: number,
 *   minAgeMs?: number,
 *   prefix?: string,
 * }} input
 * @returns {Array<MediaRow & { assetExists: boolean, bytes: number }>}
 */
export function findUnreferencedMedia({
  mediaRows,
  referencedIds,
  assets = [],
  now = Date.now(),
  minAgeMs = DEFAULT_MIN_AGE_HOURS * HOUR_MS,
  prefix = MANAGED_PREFIX,
}) {
  const referenced =
    referencedIds instanceof Set ? referencedIds : new Set(referencedIds)

  const assetByKey = new Map(
    assets.map((asset) => [`${asset.resourceType}:${asset.publicId}`, asset]),
  )

  return mediaRows
    .filter((row) => {
      if (!row.publicId.startsWith(MANAGED_PREFIX)) return false
      if (!row.publicId.startsWith(prefix)) return false
      if (referenced.has(row.id)) return false

      const created = Date.parse(row.createdAt)
      if (Number.isNaN(created)) return false

      return now - created >= minAgeMs
    })
    .map((row) => {
      const asset = assetByKey.get(`${row.kind}:${row.publicId}`)

      return {
        ...row,
        assetExists: Boolean(asset),
        bytes: asset?.bytes ?? 0,
      }
    })
}

export function parseArgs(argv) {
  const options = {
    apply: false,
    includeUnreferenced: false,
    minAgeHours: DEFAULT_MIN_AGE_HOURS,
    prefix: MANAGED_PREFIX,
  }

  for (const arg of argv) {
    if (arg === '--delete') options.apply = true
    else if (arg === '--include-unreferenced')
      options.includeUnreferenced = true
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

const PAGE_SIZE = 1000

// Recorre una tabla entera de Supabase paginando, con orden estable (sin
// él, `range` puede saltarse o repetir filas entre páginas).
async function readAllRows(supabase, table, columns, orderBy) {
  const rows = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderBy)
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(`Supabase (${table}): ${error.message}`)

    rows.push(...(data ?? []))

    if (!data || data.length < PAGE_SIZE) break
  }

  return rows
}

/** Todas las filas de `media_asset`, sea cual sea el estado de su contenido. */
export async function listMediaRows(supabase) {
  const rows = await readAllRows(
    supabase,
    'media_asset',
    'id, kind, cloudinary_public_id, created_at',
    'id',
  )

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    publicId: row.cloudinary_public_id,
    createdAt: row.created_at,
  }))
}

/**
 * Ids de `media_asset` que algo referencia. Son las cuatro únicas claves
 * foráneas hacia `media_asset`: `pin_media`, `case_detail_media`,
 * `content.cover_media_id` y `content.og_media_id`.
 *
 * SIN filtrar por el estado del contenido a propósito: un medio de un
 * contenido en draft, programado o despublicado también está en uso.
 */
export async function listReferencedMediaIds(supabase) {
  const referenced = new Set()

  const sources = [
    { table: 'pin_media', columns: 'media_id', orderBy: 'media_id' },
    { table: 'case_detail_media', columns: 'media_id', orderBy: 'media_id' },
    {
      table: 'content',
      columns: 'cover_media_id, og_media_id',
      orderBy: 'id',
    },
  ]

  for (const { table, columns, orderBy } of sources) {
    for (const row of await readAllRows(supabase, table, columns, orderBy)) {
      for (const id of Object.values(row)) {
        if (typeof id === 'string') referenced.add(id)
      }
    }
  }

  return referenced
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

// Borra archivos de Cloudinary en lotes de 100 (límite de la Admin API).
// Nunca lanza: devuelve el recuento de borrados y fallos.
export async function deleteFromCloudinary(cloudinary, items) {
  let deleted = 0
  let failed = 0

  for (const resourceType of ['image', 'video']) {
    const ids = items
      .filter((item) => item.resourceType === resourceType)
      .map((item) => item.publicId)

    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100)

      let result

      try {
        result = await cloudinary.api.delete_resources(batch, {
          resource_type: resourceType,
          type: 'upload',
          invalidate: true,
        })
      } catch (error) {
        failed += batch.length
        console.error(
          `  Cloudinary rechazó un lote de ${batch.length} ${resourceType}: ${error instanceof Error ? error.message : error}`,
        )
        continue
      }

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

  return { deleted, failed }
}

// Borra filas de `media_asset`. Va por lotes y, si un lote falla (típico: una
// fila que justo ahora sí está referenciada → violación de clave foránea),
// reintenta fila a fila para aislar la que falla sin perder el resto.
export async function deleteMediaRows(supabase, rows) {
  const deletedIds = new Set()
  let failed = 0

  const tryDelete = async (ids) => {
    const { data, error } = await supabase
      .from('media_asset')
      .delete()
      .in('id', ids)
      .select('id')

    if (error) return { error }

    for (const row of data ?? []) deletedIds.add(row.id)

    return { error: null }
  }

  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)

    const { error } = await tryDelete(batch.map((row) => row.id))

    if (!error) continue

    for (const row of batch) {
      const single = await tryDelete([row.id])

      if (single.error) {
        failed += 1
        console.error(
          `  No se borró la fila ${row.id} (${row.publicId}): ${single.error.message}`,
        )
      }
    }
  }

  return { deletedIds, failed }
}

/**
 * La parte DESTRUCTIVA, separada de main para poder probarla con fakes.
 *
 * Orden deliberado: del tipo 2 se borra primero la FILA y solo después el
 * archivo, y solo el de las filas que de verdad se borraron. Si algo falla a
 * medias, lo peor que puede quedar es un archivo sin fila (lo recoge el tipo
 * 1 en la siguiente pasada); nunca una fila apuntando a un archivo que ya no
 * existe, ni un archivo borrado cuya fila sigue en uso.
 */
export async function applyCleanup({
  supabase,
  cloudinary,
  orphanFiles,
  unreferenced,
  includeUnreferenced,
}) {
  const summary = {
    rowsDeleted: 0,
    unreferencedFilesDeleted: 0,
    unreferencedFailures: 0,
    orphanFilesDeleted: 0,
    orphanFailures: 0,
    failures: 0,
  }

  if (includeUnreferenced && unreferenced.length > 0) {
    const { deletedIds, failed } = await deleteMediaRows(supabase, unreferenced)

    const filesToDelete = unreferenced
      .filter((row) => deletedIds.has(row.id) && row.assetExists)
      .map((row) => ({ publicId: row.publicId, resourceType: row.kind }))

    const files = await deleteFromCloudinary(cloudinary, filesToDelete)

    summary.rowsDeleted = deletedIds.size
    summary.unreferencedFilesDeleted = files.deleted
    summary.unreferencedFailures = failed + files.failed
  }

  if (orphanFiles.length > 0) {
    const { deleted, failed } = await deleteFromCloudinary(
      cloudinary,
      orphanFiles.map((asset) => ({
        publicId: asset.publicId,
        resourceType: asset.resourceType,
      })),
    )

    summary.orphanFilesDeleted = deleted
    summary.orphanFailures = failed
  }

  summary.failures = summary.unreferencedFailures + summary.orphanFailures

  return summary
}

function formatMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const minAgeMs = options.minAgeHours * HOUR_MS

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
    `Modo: ${options.apply ? 'BORRAR' : 'simulación (no se borra nada)'}${options.apply && options.includeUnreferenced ? ' + filas sin referencias' : ''} · prefijo ${options.prefix} · antigüedad mínima ${options.minAgeHours} h`,
  )

  const [assets, mediaRows, referencedIds] = await Promise.all([
    listCloudinaryAssets(cloudinary, options.prefix),
    listMediaRows(supabase),
    listReferencedMediaIds(supabase),
  ])

  const registeredPublicIds = new Set(mediaRows.map((row) => row.publicId))

  const orphanFiles = findOrphanAssets({
    assets,
    registeredPublicIds,
    minAgeMs,
  })

  const unreferenced = findUnreferencedMedia({
    mediaRows,
    referencedIds,
    assets,
    minAgeMs,
    prefix: options.prefix,
  })

  const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0)
  const orphanBytes = orphanFiles.reduce((sum, asset) => sum + asset.bytes, 0)
  const unreferencedBytes = unreferenced.reduce(
    (sum, row) => sum + row.bytes,
    0,
  )

  console.log(
    `Cloudinary: ${assets.length} archivos (${formatMb(totalBytes)}) · media_asset: ${mediaRows.length} filas · en uso: ${referencedIds.size}`,
  )

  console.log(
    `\n1) Archivos en Cloudinary SIN fila en media_asset: ${orphanFiles.length} (${formatMb(orphanBytes)})`,
  )
  for (const orphan of orphanFiles) {
    console.log(
      `  ${orphan.resourceType.padEnd(5)} ${formatMb(orphan.bytes).padStart(10)}  ${orphan.publicId}  (${orphan.createdAt})`,
    )
  }

  const withoutFile = unreferenced.filter((row) => !row.assetExists).length

  console.log(
    `\n2) Filas de media_asset que NADA referencia: ${unreferenced.length} (${formatMb(unreferencedBytes)} en Cloudinary${withoutFile > 0 ? `; ${withoutFile} sin archivo` : ''})`,
  )
  for (const row of unreferenced) {
    console.log(
      `  ${row.kind.padEnd(5)} ${formatMb(row.bytes).padStart(10)}  ${row.publicId}  (${row.createdAt})${row.assetExists ? '' : '  [sin archivo en Cloudinary]'}`,
    )
  }

  if (orphanFiles.length === 0 && unreferenced.length === 0) return

  if (!options.apply) {
    console.log(
      '\nSimulación: no se ha borrado nada.\n' +
        '  --delete                          borra el tipo 1\n' +
        '  --delete --include-unreferenced   borra el tipo 1 y el tipo 2',
    )
    return
  }

  const summary = await applyCleanup({
    supabase,
    cloudinary,
    orphanFiles,
    unreferenced,
    includeUnreferenced: options.includeUnreferenced,
  })

  if (options.includeUnreferenced && unreferenced.length > 0) {
    console.log(
      `\nTipo 2 — filas borradas: ${summary.rowsDeleted} · archivos borrados: ${summary.unreferencedFilesDeleted} · fallos: ${summary.unreferencedFailures}`,
    )
  }

  if (orphanFiles.length > 0) {
    console.log(
      `\nTipo 1 — archivos borrados: ${summary.orphanFilesDeleted} · fallos: ${summary.orphanFailures}`,
    )
  }

  if (!options.includeUnreferenced && unreferenced.length > 0) {
    console.log(
      `\nQuedan ${unreferenced.length} filas sin referencias sin tocar: añade --include-unreferenced para borrarlas.`,
    )
  }

  if (summary.failures > 0) process.exitCode = 1
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
