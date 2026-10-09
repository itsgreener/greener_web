#!/usr/bin/env node
/**
 * Calentador de vídeos en Cloudinary (fase 2 del contrato de medios, 8 oct
 * 2026; contrato-medios-fase-1.md §9).
 *
 * «Calentar» = pedir a Cloudinary, por adelantado y de forma asíncrona
 * (eager), las versiones de vídeo que la web va a servir, para que el primer
 * visitante no espere a que se generen al vuelo. La web lo hace sola al
 * publicar o programar un contenido y al subir un vídeo a uno ya publicado;
 * este script es para lo que ya existía antes (el relleno inicial), para
 * reintentar fallos y para comprobar el estado.
 *
 * ESTE SCRIPT NO IMPORTA EL CÓDIGO DE LA APP (un .mjs no puede cargar el
 * TypeScript): reimplementa el plan de calentamiento y las cadenas. Un test
 * (tests/unit/media/warmCloudinary.test.ts) compara las dos implementaciones
 * con miles de casos al azar; si el contrato de entrega cambia, el test
 * falla hasta que se actualice aquí.
 *
 * USO (desde la raíz, con las variables del `.env.local`):
 *
 *   node --env-file=.env.local scripts/warm-cloudinary.mjs
 *       Simulación (por defecto): lista qué se calentaría, con un coste
 *       estimado. No toca Cloudinary ni la base de datos.
 *
 *   node --env-file=.env.local scripts/warm-cloudinary.mjs --execute
 *       Calienta de verdad lo que falte y lo anota en `media_asset`.
 *
 *   node --env-file=.env.local scripts/warm-cloudinary.mjs --check
 *       Solo lectura: para los vídeos anotados como calentados, comprueba en
 *       Cloudinary que las versiones existen.
 *
 * OPCIONES
 *   --execute          Calienta de verdad. Sin ella NUNCA calienta.
 *   --inspect=ID       Enseña las derivadas reales de un vídeo (public_id o trozo) frente al plan.
 *   --check            Comprueba el estado en Cloudinary (no calienta).
 *   --force            Repite también lo ya calentado. CUESTA CRÉDITOS DE
 *                      NUEVO: Cloudinary regenera y cobra (comprobado el 8 oct).
 *   --include-drafts   Incluye contenido en borrador (por defecto solo
 *                      publicado y programado).
 *   --content=ID       Solo un contenido.
 *   --max-credits=N    Tope del coste ESTIMADO (por defecto 5). Con --execute,
 *                      si la estimación alta lo supera, no hace nada.
 *
 * COSTE: la estimación es 1/500 a 1/250 de crédito por segundo y cadena
 * (inferida de las pruebas del 8 oct; el panel de Cloudinary manda). Los
 * vídeos sin duración conocida no entran en la cifra y se avisa de ello.
 *
 * VARIABLES: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY,
 * NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
 * La clave secreta de Supabase salta RLS: ejecútalo solo desde tu máquina.
 */

import { pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------
// Contrato de entrega (copia a mano de mediaDelivery.ts / cloudinaryUrl.ts)
// ---------------------------------------------------------------------------

export const FEED_WIDTH = 480
export const MAX_ANIMATED_SECONDS = 8
export const DEFAULT_MAX_CREDITS = 5
export const FALLBACK_RATIO = '4:5'

export const RUNG_M = {
  '16:9': { width: 1280, height: 720 },
  '4:3': { width: 1104, height: 828 },
  '1:1': { width: 960, height: 960 },
  '4:5': { width: 856, height: 1070 },
  '3:4': { width: 828, height: 1104 },
  '2:3': { width: 780, height: 1170 },
  '9:16': { width: 720, height: 1280 },
}

export const RUNG_L = {
  '16:9': { width: 1600, height: 900 },
  '4:3': { width: 1380, height: 1036 },
  '1:1': { width: 1200, height: 1200 },
  '4:5': { width: 1070, height: 1338 },
  '3:4': { width: 1036, height: 1380 },
  '2:3': { width: 976, height: 1464 },
  '9:16': { width: 900, height: 1600 },
}

const RATIO_VALUE = {
  '1:1': 1 / 1,
  '4:3': 4 / 3,
  '4:5': 4 / 5,
  '3:4': 3 / 4,
  '2:3': 2 / 3,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
}

// Mismo orden que `pinRatioSchema.options`: en un empate gana el primero.
const RATIO_ORDER = ['1:1', '4:3', '4:5', '3:4', '2:3', '9:16', '16:9']

const FORMATS = ['f_webm,vc_vp9', 'f_mp4,vc_h264']

const PROFILES = {
  feed: { quality: 'auto:eco', audio: false },
  toolDetail: { quality: 'auto', audio: false },
  caseDetail: { quality: 'auto', audio: true },
}

export function closestClosedRatio(width, height) {
  const logActual = Math.log(width / height)
  let closest = RATIO_ORDER[0]
  let closestDistance = Infinity

  for (const candidate of RATIO_ORDER) {
    const distance = Math.abs(logActual - Math.log(RATIO_VALUE[candidate]))
    if (distance < closestDistance) {
      closestDistance = distance
      closest = candidate
    }
  }

  return closest
}

export function chainsFor(profile, size) {
  const { quality, audio } = PROFILES[profile]
  const dimensions =
    size.height === undefined
      ? `w_${size.width}`
      : `w_${size.width},h_${size.height}`

  return FORMATS.map((format) =>
    [
      ...(audio ? [] : ['ac_none']),
      `c_limit,${dimensions}`,
      format,
      `q_${quality}`,
    ].join('/'),
  )
}

// ---------------------------------------------------------------------------
// Plan (copia de warmPlan.ts)
// ---------------------------------------------------------------------------

function canAnimateInFeed(duration) {
  if (duration === null || duration === undefined) return true
  return duration <= MAX_ANIMATED_SECONDS
}

function rungM(ratio) {
  const { width, height } = RUNG_M[ratio]
  return { width, height }
}

function rungL(ratio) {
  const { width, height } = RUNG_L[ratio]
  return { width, height }
}

function renditionsFor(usage) {
  switch (usage.kind) {
    case 'pin': {
      const out = []

      if (
        usage.autoplayMode !== null &&
        canAnimateInFeed(usage.durationSeconds)
      ) {
        out.push({ profile: 'feed', size: { width: FEED_WIDTH } })
      }

      if (usage.contentType === 'tool') {
        // M y L: según la caja y el DPR de cada visitante se pide uno u otro.
        out.push(
          { profile: 'toolDetail', size: rungM(usage.pinRatio) },
          { profile: 'toolDetail', size: rungL(usage.pinRatio) },
        )
      }

      return out
    }

    case 'caseCarousel':
      return [
        {
          profile: 'caseDetail',
          size: rungM(closestClosedRatio(usage.width, usage.height)),
        },
      ]

    case 'otherCover':
      return [
        {
          profile: 'caseDetail',
          size: rungM(usage.coverRatio ?? FALLBACK_RATIO),
        },
      ]

    default:
      return []
  }
}

export function planVideoWarming(usages) {
  const byKey = new Map()

  for (const usage of usages) {
    for (const r of renditionsFor(usage)) {
      byKey.set(`${r.profile}:${r.size.width}x${r.size.height ?? 'auto'}`, r)
    }
  }

  return [...byKey.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, r]) => r)
}

export function warmContractId(transformations) {
  const text = [...transformations].sort().join('\n')

  function fnv1a(input) {
    let hash = 0x811c9dc5
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i)
      hash = Math.imul(hash, 0x01000193) >>> 0
    }
    return hash
  }

  const forward = fnv1a(text).toString(16).padStart(8, '0')
  const backward = fnv1a([...text].reverse().join(''))
    .toString(16)
    .padStart(8, '0')

  return `w1-${forward}${backward}`
}

/** Cadenas y contrato de un vídeo con estos usos (null si no hay nada que calentar). */
export function transformationsForUsages(usages) {
  const renditions = planVideoWarming(usages)
  if (renditions.length === 0) return null

  const transformations = renditions.flatMap((r) =>
    chainsFor(r.profile, r.size),
  )

  return { transformations, contract: warmContractId(transformations) }
}

// ---------------------------------------------------------------------------
// Decisión (pura, la que se testea)
// ---------------------------------------------------------------------------

/**
 * @param {{
 *   media: Array<{ id: string, publicId: string, durationSeconds: number | null, warmedContract: string | null }>,
 *   usagesByMedia: Map<string, object[]>,
 *   force?: boolean,
 * }} input
 */
export function buildWarmJobs({ media, usagesByMedia, force = false }) {
  const jobs = []
  const alreadyWarm = []

  for (const item of media) {
    const plan = transformationsForUsages(usagesByMedia.get(item.id) ?? [])
    if (!plan) continue

    if (!force && item.warmedContract === plan.contract) {
      alreadyWarm.push(item)
      continue
    }

    jobs.push({ ...item, ...plan })
  }

  return { jobs, alreadyWarm }
}

/** Estimación de créditos de los trabajos: 1/500 a 1/250 por segundo y cadena. */
export function estimateJobsCredits(jobs) {
  let seconds = 0
  let unknownDuration = 0

  for (const job of jobs) {
    if (typeof job.durationSeconds === 'number' && job.durationSeconds > 0) {
      seconds += job.durationSeconds * job.transformations.length
    } else {
      unknownDuration += 1
    }
  }

  return { low: seconds / 500, high: seconds / 250, unknownDuration }
}

export function parseArgs(argv) {
  const options = {
    execute: false,
    check: false,
    inspect: undefined,
    force: false,
    includeDrafts: false,
    content: undefined,
    maxCredits: DEFAULT_MAX_CREDITS,
  }

  for (const arg of argv) {
    if (arg === '--execute') options.execute = true
    else if (arg === '--check') options.check = true
    else if (arg.startsWith('--inspect=')) options.inspect = arg.split('=')[1]
    else if (arg === '--force') options.force = true
    else if (arg === '--include-drafts') options.includeDrafts = true
    else if (arg.startsWith('--content=')) options.content = arg.split('=')[1]
    else if (arg.startsWith('--max-credits=')) {
      const value = Number(arg.split('=')[1])
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`--max-credits no es válido: ${arg}`)
      }
      options.maxCredits = value
    } else {
      throw new Error(`Opción desconocida: ${arg}`)
    }
  }

  if ((options.check || options.inspect) && options.execute) {
    throw new Error(
      '--check y --inspect no se combinan con --execute: solo leen.',
    )
  }

  return options
}

// ---------------------------------------------------------------------------
// Lectura de Supabase
// ---------------------------------------------------------------------------

const PAGE_SIZE = 1000

async function readAll(supabase, table, columns, orderBy) {
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

function contentKind(type) {
  return ['case', 'insight', 'tool', 'episode'].includes(type) ? type : 'other'
}

/** Vídeos y usos de todo el contenido (o de uno), con su estado. */
export async function readWarmData(supabase, { content, includeDrafts }) {
  const contents = (
    await readAll(
      supabase,
      'content',
      'id, type, status, cover_media_id, cover_ratio',
      'id',
    )
  ).filter(
    (c) =>
      (!content || c.id === content) && (includeDrafts || c.status !== 'draft'),
  )

  const contentById = new Map(contents.map((c) => [c.id, c]))

  const mediaRows = await readAll(
    supabase,
    'media_asset',
    'id, kind, cloudinary_public_id, width, height, duration_seconds, warmed_contract, warm_error',
    'id',
  )

  const videos = new Map(
    mediaRows.filter((m) => m.kind === 'video').map((m) => [m.id, m]),
  )

  const usagesByMedia = new Map()

  function add(mediaId, usage) {
    if (!videos.has(mediaId)) return
    if (!usagesByMedia.has(mediaId)) usagesByMedia.set(mediaId, [])
    usagesByMedia.get(mediaId).push(usage)
  }

  const pins = (
    await readAll(supabase, 'pin', 'id, content_id, ratio, autoplay_mode', 'id')
  ).filter((p) => contentById.has(p.content_id))

  const pinById = new Map(pins.map((p) => [p.id, p]))

  for (const row of await readAll(
    supabase,
    'pin_media',
    'pin_id, media_id',
    'pin_id',
  )) {
    const pin = pinById.get(row.pin_id)
    const video = videos.get(row.media_id)
    if (!pin || !video) continue

    add(row.media_id, {
      kind: 'pin',
      contentType: contentKind(contentById.get(pin.content_id).type),
      pinRatio: pin.ratio,
      durationSeconds: video.duration_seconds,
      autoplayMode: pin.autoplay_mode,
    })
  }

  for (const row of await readAll(
    supabase,
    'case_detail_media',
    'content_id, media_id',
    'content_id',
  )) {
    const video = videos.get(row.media_id)
    if (!contentById.has(row.content_id) || !video) continue
    if (!video.width || !video.height) continue

    add(row.media_id, {
      kind: 'caseCarousel',
      width: video.width,
      height: video.height,
    })
  }

  for (const c of contents) {
    if (contentKind(c.type) === 'other' && c.cover_media_id) {
      add(c.cover_media_id, {
        kind: 'otherCover',
        coverRatio: c.cover_ratio ?? null,
      })
    }
  }

  const media = [...usagesByMedia.keys()].map((id) => {
    const v = videos.get(id)
    return {
      id,
      publicId: v.cloudinary_public_id,
      durationSeconds: v.duration_seconds,
      warmedContract: v.warmed_contract,
      warmError: v.warm_error,
    }
  })

  return { media, usagesByMedia }
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

  const { media, usagesByMedia } = await readWarmData(supabase, options)

  const { jobs, alreadyWarm } = buildWarmJobs({
    media,
    usagesByMedia,
    force: options.force,
  })

  if (options.inspect) {
    await runInspect({
      cloudinary,
      media,
      usagesByMedia,
      term: options.inspect,
    })
    return
  }

  if (options.check) {
    await runCheck({ cloudinary, media, usagesByMedia })
    return
  }

  const estimate = estimateJobsCredits(jobs)

  console.log(`Vídeos con algo que calentar: ${jobs.length}`)
  console.log(`Ya calentados con el contrato vigente: ${alreadyWarm.length}`)

  for (const job of jobs) {
    console.log(
      `  ${job.publicId} (${job.durationSeconds ?? '?'} s): ${job.transformations.length} cadenas${job.warmError ? ` — último error: ${job.warmError}` : ''}`,
    )
  }

  console.log(
    `\nCoste estimado: ${estimate.low.toFixed(2)}-${estimate.high.toFixed(2)} créditos` +
      (estimate.unknownDuration > 0
        ? ` (sin contar ${estimate.unknownDuration} vídeo(s) de duración desconocida)`
        : ''),
  )

  if (!options.execute) {
    console.log('\nSimulación: no se ha calentado nada. Usa --execute.')
    return
  }

  if (estimate.high > options.maxCredits) {
    console.error(
      `\nLa estimación alta (${estimate.high.toFixed(2)}) supera --max-credits=${options.maxCredits}. No se hace nada. Súbelo si lo has decidido.`,
    )
    process.exit(2)
  }

  let warmed = 0
  let failed = 0

  for (const job of jobs) {
    let reason = null

    try {
      await cloudinary.uploader.explicit(job.publicId, {
        type: 'upload',
        resource_type: 'video',
        eager: job.transformations,
        eager_async: true,
      })
    } catch (error) {
      reason = String(error?.message ?? error).slice(0, 200)
      console.error(`  ${job.publicId}: ${reason}`)
    }

    const { error: rpcError } = await supabase.rpc('mark_media_asset_warmed', {
      p_media_id: job.id,
      p_contract: job.contract,
      p_error: reason,
    })

    if (rpcError) {
      console.error(`  ${job.publicId}: no se pudo anotar: ${rpcError.message}`)
      failed += 1
    } else if (reason) {
      failed += 1
    } else {
      warmed += 1
    }
  }

  console.log(
    `\nEncargados: ${warmed}. Fallidos: ${failed}. Cloudinary los termina en unos minutos; comprueba con --check.`,
  )
  if (failed > 0) process.exitCode = 1
}

/**
 * Diagnóstico de UN vídeo: enseña, tal cual las devuelve Cloudinary, las
 * transformaciones derivadas y las compara con las del plan. `term` es el
 * public_id completo o un trozo de él. Sirve para ver si una URL que el
 * navegador pide existe ya como derivada (y con qué forma exacta).
 */
async function runInspect({ cloudinary, media, usagesByMedia, term }) {
  const matches = media.filter((item) => item.publicId.includes(term))

  if (matches.length === 0) {
    console.log(`Ningún vídeo del plan contiene «${term}».`)
    return
  }

  for (const item of matches) {
    const plan = transformationsForUsages(usagesByMedia.get(item.id) ?? [])
    const resource = await cloudinary.api.resource(item.publicId, {
      resource_type: 'video',
      type: 'upload',
    })
    const derivedEntries = resource.derived ?? []
    const derived = derivedEntries.map((d) => d.transformation)

    console.log(`\n${item.publicId}`)
    console.log(`  Contrato guardado: ${item.warmedContract ?? '(ninguno)'}`)
    console.log(`  Contrato del plan: ${plan?.contract ?? '(sin plan)'}`)
    console.log(`  Derivadas en Cloudinary (${derived.length}):`)
    for (const d of derivedEntries) {
      console.log(
        `    ${d.transformation}  [formato: ${d.format ?? '?'}, ${d.bytes ?? '?'} bytes]`,
      )
      console.log(`      ${d.secure_url ?? d.url ?? '(sin url)'}`)
    }
    console.log('  Del plan:')
    for (const t of plan?.transformations ?? []) {
      console.log(`    ${derived.includes(t) ? 'OK       ' : 'FALTA    '}${t}`)
    }
  }
}

async function runCheck({ cloudinary, media, usagesByMedia }) {
  let ok = 0
  let missingCount = 0

  for (const item of media) {
    const plan = transformationsForUsages(usagesByMedia.get(item.id) ?? [])
    if (!plan) continue

    if (item.warmedContract !== plan.contract) {
      console.log(`  SIN CALENTAR  ${item.publicId}`)
      missingCount += 1
      continue
    }

    try {
      const resource = await cloudinary.api.resource(item.publicId, {
        resource_type: 'video',
        type: 'upload',
      })

      const derived = new Set(
        (resource.derived ?? []).map((d) => d.transformation),
      )

      const missing = plan.transformations.filter((t) => !derived.has(t))

      if (missing.length === 0) {
        ok += 1
      } else {
        missingCount += 1
        console.log(
          `  INCOMPLETO    ${item.publicId}: faltan ${missing.length} de ${plan.transformations.length} (puede seguir en curso)`,
        )
      }
    } catch (error) {
      missingCount += 1
      console.log(
        `  ERROR         ${item.publicId}: ${error?.message ?? error}`,
      )
    }
  }

  console.log(`\nCompletos: ${ok}. Pendientes o con problema: ${missingCount}.`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
