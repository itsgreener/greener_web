#!/usr/bin/env node
/**
 * Prueba desechable contra Cloudinary REAL (fase 2 del contrato de medios,
 * paso 0 de contrato-medios-fase-1.md §9.9). 8 oct 2026.
 *
 * NO es código de la aplicación: sirve para responder, ANTES de escribir el
 * calentamiento, lo que no se puede comprobar desde el entorno de Claude
 * (que no llega a Cloudinary). Se borra cuando la fase 2 esté cerrada.
 *
 * QUÉ CONTESTA
 *  0. ¿La Admin API devuelve `duration` de un vídeo (con y sin
 *     `image_metadata`)? Es lo que faltaba para quitar el relleno de
 *     verifyCloudinaryVideoAsset. También lista las derivadas que ya tiene.
 *  1. ¿`uploader.explicit` acepta las cadenas del contrato como `eager` con
 *     `eager_async: true`? ¿Con qué forma (cadena suelta u objeto)? ¿Cuánto
 *     tarda en aparecer la derivada, mirando la Admin API (`derived`)?
 *  2. Con la derivada ya generada por el eager, ¿la URL de ENTREGA (la misma
 *     cadena que usa PinCard) responde 200 con el Content-Type correcto y
 *     SIN crear una derivada nueva? (Si crea una, la cadena del eager y la
 *     de entrega no coinciden y calentar no sirve.)
 *  3. ¿Repetir el mismo `explicit` vuelve a generar o a cobrar?
 *  4. ¿Responden las cadenas de la FICHA (escalón M) en una petición al
 *     vuelo, sin eager? (Valida a la vez el contrato de la fase 1, que
 *     ninguna prueba ha visto aún contra Cloudinary real.) Mide el tiempo
 *     de la primera petición.
 *  5. (opcional, `--big`) Un vídeo grande (40-100 MB): ¿la entrega al vuelo
 *     da el error «too large»? ¿El eager asíncrono lo genera y se sirve?
 *
 * COSTE. Esta prueba GASTA créditos de Cloudinary (una rendición de vídeo
 * cuesta unos 0,004-0,008 créditos por segundo de clip y formato; ver
 * contrato §11). Con un clip de ~7 s y las etapas 1, 3 y 4 son unas 6
 * rendiciones: del orden de 0,2-0,3 créditos. El vídeo grande (`--big`)
 * cuesta en proporción a SU duración: el script la muestra y estima antes
 * de pedir nada. Sin `--execute` NO se genera ninguna derivada (solo se
 * muestran las URL y las cadenas).
 *
 * USO (desde la raíz del repo; Node 24; con las variables del .env.local):
 *
 *   node --env-file=.env.local scripts/warm-probe.mjs \
 *     --small=greener/content/videos/XXXX --ratio=4:5
 *       Simulación: enseña qué haría y las URL. No gasta nada.
 *
 *   node --env-file=.env.local scripts/warm-probe.mjs \
 *     --small=greener/content/videos/XXXX --ratio=4:5 --execute | tee warm-probe.txt
 *       Prueba real con un clip de tool (≤ 15 MB, ≤ 15 s) QUE NO SE HAYA
 *       PEDIDO ANTES con estas cadenas (si ya se vio en la home, sus
 *       versiones existen y la prueba no demuestra nada: elige uno nuevo
 *       o recién subido).
 *
 *   ... --big=greener/content/videos/YYYY --execute
 *       Añade la etapa 5 con un vídeo de 40-100 MB, también sin versiones
 *       previas. Elige uno CORTO y pesado (poco gasto, mucho peso).
 *
 *   node --env-file=.env.local scripts/warm-probe.mjs --status \
 *     --small=greener/content/videos/XXXX [--big=...]
 *       SOLO LECTURA (gratis): enseña el vídeo y sus derivadas, para ver
 *       cómo ha acabado un eager ya lanzado. Con --probe-delivery pide
 *       también las URL del feed (si la derivada no existe, la genera y
 *       se cobra).
 *
 * GUARDAS DE GASTO (8 oct, tras una primera ejecución con un vídeo de
 * 130 s y 45 MB como «clip pequeño»): sin pedir nada a Cloudinary, el
 * script se niega si el clip pequeño dura más de 15 s o pesa más de 15 MB,
 * si el grande no supera 40 MB o es el mismo vídeo, o si el peor caso
 * estimado supera --max-credits (0,5 por defecto). La etapa 3 (repetir el
 * explicit) ya no va por defecto: se pide con --repeat.
 *
 * El `public_id` está en el panel de Cloudinary o en `media_asset.
 * cloudinary_public_id` (empieza por `greener/content/videos/`).
 *
 * LA CLAVE SECRETA. Solo usa las tres variables de Cloudinary de tu
 * .env.local (nada de Supabase). Pega la SALIDA, nunca el .env.local.
 *
 * Las cadenas de transformación están copiadas de
 * `buildVideoTransformations` (cloudinaryUrl.ts) y un test
 * (tests/unit/media/warmProbe.test.ts) comprueba que coinciden.
 */

import { pathToFileURL } from 'node:url'

import { v2 as cloudinary } from 'cloudinary'

export const FEED_WIDTH = 480
export const FEED_QUALITY = 'auto:eco'
export const DETAIL_QUALITY = 'auto'

/** Escalón M por ratio (DETAIL_VIDEO_RUNGS, contrato §4.3). */
export const RUNG_M = {
  '16:9': { width: 1280, height: 720 },
  '4:3': { width: 1104, height: 828 },
  '1:1': { width: 960, height: 960 },
  '4:5': { width: 856, height: 1070 },
  '3:4': { width: 828, height: 1104 },
  '2:3': { width: 780, height: 1170 },
  '9:16': { width: 720, height: 1280 },
}

const FORMATS = [
  { transformation: 'f_webm,vc_vp9', contentType: 'video/webm' },
  { transformation: 'f_mp4,vc_h264', contentType: 'video/mp4' },
]

function chain({ audio, width, height, format, quality }) {
  const dimensions =
    height === undefined ? `w_${width}` : `w_${width},h_${height}`
  return [
    ...(audio ? [] : ['ac_none']),
    `c_limit,${dimensions}`,
    format.transformation,
    `q_${quality}`,
  ].join('/')
}

/**
 * Las dos cadenas (WebM y MP4) de un uso, en el orden de `<source>`.
 * `kind`: 'feed' (ancho 480, mudo) o 'toolDetailM' (escalón M del ratio,
 * mudo). Mismas que `buildVideoTransformations('feed' | 'toolDetail', …)`.
 */
export function chainsFor(kind, ratio) {
  if (kind === 'feed') {
    return FORMATS.map((format) =>
      chain({
        audio: false,
        width: FEED_WIDTH,
        format,
        quality: FEED_QUALITY,
      }),
    )
  }

  const rung = RUNG_M[ratio]
  if (!rung) {
    throw new Error(
      `Ratio no válido: ${ratio}. Usa uno de ${Object.keys(RUNG_M).join(', ')}.`,
    )
  }

  return FORMATS.map((format) =>
    chain({
      audio: false,
      width: rung.width,
      height: rung.height,
      format,
      quality: DETAIL_QUALITY,
    }),
  )
}

export const CONTENT_TYPES = FORMATS.map((f) => f.contentType)

export function deliveryUrl(cloudName, publicId, transformation) {
  return `https://res.cloudinary.com/${cloudName}/video/upload/${transformation}/${publicId}`
}

/** Créditos aproximados de UNA rendición: 1/500 por segundo (SD) a 1/250 (HD). */
export function estimateCredits(durationSeconds, renditions) {
  const perSecondLow = 1 / 500
  const perSecondHigh = 1 / 250
  return {
    low: durationSeconds * renditions * perSecondLow,
    high: durationSeconds * renditions * perSecondHigh,
  }
}

/** Límites de un vídeo de pin de tool (TOOL_PIN_VIDEO_LIMITS) y de transformación síncrona en Free. */
export const SMALL_MAX_BYTES = 15 * 1024 * 1024
export const SMALL_MAX_SECONDS = 15
export const BIG_MIN_BYTES = 40 * 1024 * 1024
/** Tope de gasto estimado (peor caso) de toda la prueba, en créditos. */
export const DEFAULT_MAX_CREDITS = 0.5

/**
 * ¿Sirve este vídeo como «clip pequeño»? Es un clip de tool (≤ 15 MB y
 * ≤ 15 s). Devuelve el motivo del rechazo o null. Se añadió el 8 oct tras una
 * primera ejecución que usó un vídeo de 130 s y 45 MB como clip pequeño: el
 * gasto se multiplica por la duración.
 */
export function checkSmallClip({ bytes, duration }) {
  if (typeof duration !== 'number') {
    return 'no se conoce su duración (la Admin API no la devolvió).'
  }
  if (duration > SMALL_MAX_SECONDS) {
    return `dura ${duration.toFixed(1)} s (máximo ${SMALL_MAX_SECONDS} s en un clip de tool).`
  }
  if (bytes > SMALL_MAX_BYTES) {
    return `pesa ${(bytes / 1024 / 1024).toFixed(1)} MB (máximo ${SMALL_MAX_BYTES / 1024 / 1024} MB en un clip de tool).`
  }
  return null
}

/** ¿Sirve como «vídeo grande»? Tiene que superar los 40 MB que Free transforma al vuelo. */
export function checkBigVideo({ bytes }) {
  if (bytes <= BIG_MIN_BYTES) {
    return `pesa ${(bytes / 1024 / 1024).toFixed(1)} MB: no supera los 40 MB, no prueba nada.`
  }
  return null
}

export function parseArgs(argv) {
  const out = {
    small: undefined,
    big: undefined,
    ratio: '4:5',
    execute: false,
    status: false,
    probeDelivery: false,
    repeat: false,
    maxCredits: DEFAULT_MAX_CREDITS,
  }
  for (const arg of argv) {
    if (arg === '--execute') out.execute = true
    else if (arg === '--status') out.status = true
    else if (arg === '--probe-delivery') out.probeDelivery = true
    else if (arg === '--repeat') out.repeat = true
    else if (arg.startsWith('--max-credits=')) {
      const value = Number(arg.slice(14))
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`--max-credits no es un número válido: ${arg}`)
      }
      out.maxCredits = value
    } else if (arg.startsWith('--small=')) out.small = arg.slice(8)
    else if (arg.startsWith('--big=')) out.big = arg.slice(6)
    else if (arg.startsWith('--ratio=')) out.ratio = arg.slice(8)
    else throw new Error(`Opción desconocida: ${arg}`)
  }
  return out
}

// ---------------------------------------------------------------------------
// Utilidades de salida
// ---------------------------------------------------------------------------

function log(line = '') {
  console.log(line)
}

function section(title) {
  log()
  log(`=== ${title} ===`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function errorText(error) {
  if (error && typeof error === 'object') {
    const e = error
    return JSON.stringify(
      { message: e.message, http_code: e.http_code, name: e.name },
      null,
      0,
    )
  }
  return String(error)
}

// ---------------------------------------------------------------------------
// Cloudinary
// ---------------------------------------------------------------------------

async function getResource(publicId, extra = {}) {
  return cloudinary.api.resource(publicId, {
    resource_type: 'video',
    type: 'upload',
    ...extra,
  })
}

function derivedList(resource) {
  return Array.isArray(resource.derived) ? resource.derived : []
}

async function derivedCount(publicId) {
  const resource = await getResource(publicId)
  return {
    count: derivedList(resource).length,
    derived: derivedList(resource).map((d) => ({
      transformation: d.transformation,
      format: d.format,
      bytes: d.bytes,
    })),
  }
}

async function usageSnapshot(label) {
  try {
    const usage = await cloudinary.api.usage()
    const picked = {
      plan: usage.plan,
      last_updated: usage.last_updated,
      credits: usage.credits,
      transformations: usage.transformations,
      bandwidth: usage.bandwidth,
      storage: usage.storage,
    }
    log(`[uso ${label}] ${JSON.stringify(picked)}`)
    return picked
  } catch (error) {
    log(`[uso ${label}] no disponible: ${errorText(error)}`)
    return null
  }
}

/** Espera a que haya al menos `target` derivadas. Devuelve segundos o null. */
async function waitForDerived(publicId, target, timeoutMs = 240_000) {
  const start = Date.now()
  let last = 0
  while (Date.now() - start < timeoutMs) {
    const { count } = await derivedCount(publicId)
    last = count
    if (count >= target) {
      return { seconds: (Date.now() - start) / 1000, count }
    }
    await sleep(5000)
  }
  return { seconds: null, count: last }
}

/** GET con Range 0-1023: dispara la generación y lee cabeceras sin bajar el vídeo. */
async function probeDelivery(url) {
  const start = Date.now()
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-1023' },
      redirect: 'follow',
    })
    const elapsed = Date.now() - start
    const result = {
      status: response.status,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      contentRange: response.headers.get('content-range'),
      xCldError: response.headers.get('x-cld-error'),
      ms: elapsed,
    }
    await response.body?.cancel()
    return result
  } catch (error) {
    return { status: 'ERROR', error: errorText(error), ms: Date.now() - start }
  }
}

/**
 * Prueba las formas de `eager` por orden. Se para en la primera que acepta
 * Cloudinary (las siguientes generarían lo mismo y no se piden).
 */
async function explicitEager(publicId, chains) {
  const variants = [
    { name: 'A: array de cadenas', eager: chains },
    {
      name: 'B: array de { raw_transformation }',
      eager: chains.map((raw_transformation) => ({ raw_transformation })),
    },
  ]

  for (const variant of variants) {
    try {
      const response = await cloudinary.uploader.explicit(publicId, {
        type: 'upload',
        resource_type: 'video',
        eager: variant.eager,
        eager_async: true,
      })
      return { ok: true, variant: variant.name, response }
    } catch (error) {
      log(`  forma «${variant.name}» rechazada: ${errorText(error)}`)
    }
  }

  return { ok: false }
}

// ---------------------------------------------------------------------------
// Etapas
// ---------------------------------------------------------------------------

async function stage0(publicId) {
  section('Etapa 0 — el vídeo y su duración en la Admin API (gratis)')
  const plain = await getResource(publicId)
  log(
    `sin image_metadata: duration=${JSON.stringify(plain.duration)} bytes=${plain.bytes} ${plain.width}x${plain.height} formato=${plain.format}`,
  )
  let withMeta = null
  try {
    withMeta = await getResource(publicId, { image_metadata: true })
    log(`con image_metadata: duration=${JSON.stringify(withMeta.duration)}`)
  } catch (error) {
    log(`con image_metadata: error ${errorText(error)}`)
  }
  const existing = derivedList(plain)
  log(`derivadas ya existentes: ${existing.length}`)
  for (const d of existing) log(`  - ${d.transformation} (${d.format})`)
  return {
    duration: withMeta?.duration ?? plain.duration,
    bytes: plain.bytes,
    derivedBefore: existing.length,
  }
}

async function stage1to3({ cloudName, publicId, ratio, repeat }) {
  const feedChains = chainsFor('feed', ratio)

  section('Etapa 1 — eager asíncrono de las dos rendiciones del feed')
  const before = (await derivedCount(publicId)).count
  const requestedAt = Date.now()
  const outcome = await explicitEager(publicId, feedChains)
  if (!outcome.ok) {
    log('RESULTADO: ninguna forma de `eager` fue aceptada. Para aquí.')
    return false
  }
  log(`forma aceptada: ${outcome.variant}`)
  log(`respuesta de explicit: ${JSON.stringify(outcome.response)}`)

  const waited = await waitForDerived(publicId, before + feedChains.length)
  if (waited.seconds === null) {
    log(
      `RESULTADO: tras 240 s hay ${waited.count} derivadas (se esperaban ${before + feedChains.length}). El eager NO terminó a tiempo.`,
    )
  } else {
    log(
      `RESULTADO: ${waited.count} derivadas tras ${waited.seconds.toFixed(0)} s (desde la petición: ${((Date.now() - requestedAt) / 1000).toFixed(0)} s). La Admin API sirve para saber que el eager terminó.`,
    )
  }
  const afterEager = await derivedCount(publicId)
  for (const d of afterEager.derived) {
    log(`  - ${d.transformation} (${d.format}, ${d.bytes} B)`)
  }

  section('Etapa 2 — la URL de entrega, ¿200 y sin derivada nueva?')
  for (const transformation of feedChains) {
    const url = deliveryUrl(cloudName, publicId, transformation)
    log(`GET ${url}`)
    log(`  -> ${JSON.stringify(await probeDelivery(url))}`)
  }
  const afterDelivery = await derivedCount(publicId)
  log(
    `RESULTADO: derivadas antes de pedir la entrega ${afterEager.count}, después ${afterDelivery.count}. ` +
      (afterDelivery.count === afterEager.count
        ? 'IGUAL: la cadena del eager coincide con la de entrega.'
        : 'DISTINTO: la entrega creó una derivada propia (las cadenas no coinciden) — avisa a Claude con esta salida.'),
  )

  if (!repeat) {
    log()
    log(
      '(Etapa 3, repetir el explicit, omitida: la aplicación nunca repetirá un calentamiento ya hecho porque lo anota en la base de datos. Pídela con --repeat.)',
    )
    return true
  }

  section('Etapa 3 — repetir el mismo explicit')
  const usageBefore = await usageSnapshot('antes de repetir')
  const again = await explicitEager(publicId, feedChains)
  log(`repetición aceptada: ${again.ok ? again.variant : 'NO'}`)
  await sleep(30_000)
  const afterRepeat = await derivedCount(publicId)
  log(
    `RESULTADO: derivadas tras repetir ${afterRepeat.count} (antes ${afterDelivery.count}). ` +
      'Si no cambia, no distingue «reutilizó» de «regeneró y cobró»: compara créditos en el panel (el uso de la API puede tardar en actualizarse).',
  )
  const usageAfter = await usageSnapshot('después de repetir')
  log(
    `(Referencia) antes: ${JSON.stringify(usageBefore?.credits)} / después: ${JSON.stringify(usageAfter?.credits)}`,
  )
  return true
}

async function stage4({ cloudName, publicId, ratio }) {
  section(
    `Etapa 4 — cadenas de la FICHA (escalón M ${ratio}) al vuelo, sin eager`,
  )
  const chains = chainsFor('toolDetailM', ratio)
  const before = (await derivedCount(publicId)).count
  for (const transformation of chains) {
    const url = deliveryUrl(cloudName, publicId, transformation)
    log(`GET ${url}`)
    const result = await probeDelivery(url)
    log(`  -> ${JSON.stringify(result)}`)
  }
  const after = await derivedCount(publicId)
  log(
    `RESULTADO: derivadas ${before} -> ${after.count} (esperado +2). Si algún status no es 200/206 o el content-type no es video/webm / video/mp4, la sintaxis del contrato de la fase 1 necesita revisión.`,
  )
}

async function stage5({ cloudName, publicId }) {
  section('Etapa 5 — vídeo grande (40-100 MB)')
  const info = await stage0Quiet(publicId)
  log(
    `bytes=${info.bytes} (${(info.bytes / 1024 / 1024).toFixed(1)} MB) duración=${JSON.stringify(info.duration)} s`,
  )
  const feedMp4 = chainsFor('feed', '4:5')[1]
  const url = deliveryUrl(cloudName, publicId, feedMp4)

  log(
    '5a. Entrega al vuelo SIN eager (esperado: error «too large» si pesa > 40 MB):',
  )
  log(`GET ${url}`)
  log(`  -> ${JSON.stringify(await probeDelivery(url))}`)

  log('5b. Eager asíncrono de la rendición MP4 del feed:')
  const before = (await derivedCount(publicId)).count
  const outcome = await explicitEager(publicId, [feedMp4])
  if (!outcome.ok) {
    log('RESULTADO: el eager no fue aceptado.')
    return
  }
  const waited = await waitForDerived(publicId, before + 1, 600_000)
  log(
    waited.seconds === null
      ? `RESULTADO: tras 600 s sigue sin generarse (${waited.count} derivadas). El eager asíncrono NO sirve este vídeo: aplicar el tope de 40 MB.`
      : `RESULTADO: derivada generada en ~${waited.seconds.toFixed(0)} s.`,
  )

  log('5c. Entrega tras el eager:')
  log(`  -> ${JSON.stringify(await probeDelivery(url))}`)
}

async function stage0Quiet(publicId) {
  const resource = await getResource(publicId, { image_metadata: true })
  return { bytes: resource.bytes, duration: resource.duration }
}

// ---------------------------------------------------------------------------
// Principal
// ---------------------------------------------------------------------------

function configure() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Faltan NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET (usa --env-file=.env.local).',
    )
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  })
  return cloudName
}

function printPlan({ small, big, ratio, cloudName }) {
  section('Plan (simulación: no se genera nada)')
  log(`Cloud: ${cloudName ?? '(sin configurar)'}`)
  log(`Clip pequeño: ${small}`)
  log(`Ratio de la ficha: ${ratio}`)
  log('Cadenas del feed:')
  for (const c of chainsFor('feed', ratio)) log(`  ${c}`)
  log(`Cadenas de la ficha (M ${ratio}):`)
  for (const c of chainsFor('toolDetailM', ratio)) log(`  ${c}`)
  if (cloudName) {
    log('Ejemplo de URL de entrega del feed (WebM):')
    log(`  ${deliveryUrl(cloudName, small, chainsFor('feed', ratio)[0])}`)
  }
  if (big) log(`Vídeo grande: ${big}`)
}

/**
 * Modo `--status`: SOLO lectura de la Admin API (gratis). Enseña el vídeo y
 * sus derivadas, para ver cómo ha acabado un eager ya lanzado. Con
 * `--probe-delivery` pide además las URL de entrega del feed (con Range):
 * si la derivada ya existe no cuesta nada, pero si NO existe la genera al
 * vuelo y se cobra.
 */
async function statusMode({ cloudName, ids, ratio, probe }) {
  for (const publicId of ids) {
    section(`Estado de ${publicId}`)
    const resource = await getResource(publicId, { image_metadata: true })
    log(
      `bytes=${resource.bytes} duración=${JSON.stringify(resource.duration)} ${resource.width}x${resource.height} formato=${resource.format}`,
    )
    const derived = derivedList(resource)
    log(`derivadas: ${derived.length}`)
    for (const d of derived) {
      log(`  - ${d.transformation} (${d.format}, ${d.bytes} B)`)
    }
    if (probe) {
      for (const transformation of chainsFor('feed', ratio)) {
        const url = deliveryUrl(cloudName, publicId, transformation)
        log(`GET ${url}`)
        log(`  -> ${JSON.stringify(await probeDelivery(url))}`)
      }
    }
  }
  await usageSnapshot('estado')
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv)
  if (!args.small) {
    throw new Error('Falta --small=<public_id del clip de una tool>.')
  }
  if (!RUNG_M[args.ratio]) {
    throw new Error(
      `Ratio no válido: ${args.ratio}. Usa uno de ${Object.keys(RUNG_M).join(', ')}.`,
    )
  }

  const cloudName = configure()

  if (args.status) {
    await statusMode({
      cloudName,
      ids: [args.small, ...(args.big ? [args.big] : [])],
      ratio: args.ratio,
      probe: args.probeDelivery,
    })
    return
  }

  printPlan({ ...args, cloudName })

  if (!args.execute) {
    log()
    log('Simulación terminada. Añade --execute para hacer la prueba real.')
    return
  }

  await usageSnapshot('inicio')
  const info = await stage0(args.small)

  // --- Guardas de gasto (8 oct): antes de pedir NADA a Cloudinary ---------
  const smallProblem = checkSmallClip(info)
  if (smallProblem) {
    throw new Error(
      `El clip pequeño ${args.small} no sirve para la prueba: ${smallProblem} Elige un clip de tool (≤ 15 MB y ≤ 15 s) y repite. No se ha generado nada.`,
    )
  }

  const smallRenditions = args.repeat ? 6 : 4
  let estimate = estimateCredits(info.duration, smallRenditions)

  if (args.big) {
    if (args.big === args.small) {
      throw new Error(
        '--big y --small son el mismo vídeo. Usa un vídeo distinto para cada uno. No se ha generado nada.',
      )
    }
    const bigInfo = await stage0Quiet(args.big)
    const bigProblem = checkBigVideo(bigInfo)
    if (bigProblem) {
      throw new Error(
        `El vídeo grande ${args.big} no sirve para la prueba: ${bigProblem} No se ha generado nada.`,
      )
    }
    if (typeof bigInfo.duration !== 'number') {
      throw new Error(
        `No se conoce la duración de ${args.big}: no se puede estimar el gasto. No se ha generado nada.`,
      )
    }
    const bigEstimate = estimateCredits(bigInfo.duration, 1)
    log(
      `Vídeo grande: ${bigInfo.duration.toFixed(0)} s, ${(bigInfo.bytes / 1024 / 1024).toFixed(1)} MB -> 1 rendición: ${bigEstimate.low.toFixed(3)}-${bigEstimate.high.toFixed(3)} créditos.`,
    )
    estimate = {
      low: estimate.low + bigEstimate.low,
      high: estimate.high + bigEstimate.high,
    }
  }

  log(
    `Estimación TOTAL de esta prueba: ${estimate.low.toFixed(3)}-${estimate.high.toFixed(3)} créditos (tope --max-credits=${args.maxCredits}).`,
  )
  if (estimate.high > args.maxCredits) {
    throw new Error(
      `El peor caso estimado (${estimate.high.toFixed(3)} créditos) supera el tope de ${args.maxCredits}. No se ha generado nada. Si lo aceptas, repite con --max-credits=${Math.ceil(estimate.high * 10) / 10}.`,
    )
  }

  const ok = await stage1to3({
    cloudName,
    publicId: args.small,
    ratio: args.ratio,
    repeat: args.repeat,
  })
  if (ok) await stage4({ cloudName, publicId: args.small, ratio: args.ratio })

  if (args.big) {
    await stage5({ cloudName, publicId: args.big })
  }

  section('Final')
  await usageSnapshot('final')
  log(
    'Mira también el panel de Cloudinary (Settings → Usage): la API de uso puede tardar horas en reflejar el gasto. Pega esta salida completa.',
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
