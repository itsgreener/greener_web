import { clientEnv } from '@/lib/env.client'

import {
  FEED_VIDEO_WIDTH,
  IMAGE_DELIVERY,
  VIDEO_PROFILES,
  type MediaContext,
  type VideoProfile,
} from '../domain/mediaDelivery'

/**
 * Construye URLs de transformación de Cloudinary a partir del contrato de
 * entrega de modules/media/domain/mediaDelivery.ts. Es la única pieza que
 * conoce la sintaxis de Cloudinary (arquitectura §24.4 — capa
 * infrastructure/).
 *
 * CONTRATO CONGELADO (contrato-medios-fase-1.md §4): las cadenas de este
 * fichero están fijadas por tests/unit/media/mediaContract.test.ts con
 * cadenas EXACTAS. Cambiar una «un poco» regenera versiones en Cloudinary y
 * deja las antiguas ocupando almacenamiento (Free: 25 créditos): si hay que
 * cambiar algo, se hace de golpe y se documenta (§4.7).
 */

const CLOUD_NAME = clientEnv.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

function baseUrl(resourceType: 'image' | 'video') {
  return `https://res.cloudinary.com/${CLOUD_NAME}/${resourceType}/upload`
}

/**
 * URL de imagen optimizada para feed o detalle: calidad del contrato,
 * f_auto y el ancho más adecuado al contexto (§3 de la política de medios).
 */
export function buildImageUrl(
  publicId: string,
  context: MediaContext,
  width?: number,
) {
  const config = IMAGE_DELIVERY[context]
  const targetWidth = width ?? config.widths[config.widths.length - 1]
  const transform = `q_${config.quality},f_${config.format},w_${targetWidth},c_limit`
  return `${baseUrl('image')}/${transform}/${publicId}`
}

/** srcset completo para el contexto, alineado con los breakpoints del masonry. */
export function buildImageSrcSet(publicId: string, context: MediaContext) {
  return IMAGE_DELIVERY[context].widths
    .map((w) => `${buildImageUrl(publicId, context, w)} ${w}w`)
    .join(', ')
}

/** Tamaño máximo de una rendición de vídeo (`c_limit`: nunca amplía). */
export interface VideoSize {
  width: number
  /** Solo en los escalones M/L de la ficha, que acotan también el alto. */
  height?: number
}

export interface VideoSource {
  src: string
  /** Para el atributo `type` del `<source>`: el navegador descarta el que no sepa reproducir sin pedirlo. */
  type: string
}

/**
 * Los dos formatos de vídeo explícitos del contrato (§4.5), en orden de
 * preferencia: WebM/VP9 primero y MP4/H.264 de reserva. Se pide cada formato
 * y códec por separado, NUNCA `f_auto`: así hay como máximo dos derivadas por
 * tamaño (con `f_auto` pueden ser hasta cuatro) y son exactamente las
 * mismas cadenas que usará el eager de la fase 2 (`f_auto` no funciona en
 * un eager). A cambio se pierden AV1 y HEVC.
 *
 * La URL de entrega lleva SIEMPRE la extensión del formato (`.webm`,
 * `.mp4`): el eager de Cloudinary guarda la derivada con extensión, y una
 * URL sin ella (el public_id a secas) es OTRA derivada (8 oct 2026: salía
 * en la lista con una `/` final y se regeneraba, y cobraba, al abrirla por
 * primera vez aunque la calentada existiera).
 */
const VIDEO_FORMATS = [
  {
    transformation: 'f_webm,vc_vp9',
    type: 'video/webm; codecs="vp9"',
    extension: 'webm',
  },
  { transformation: 'f_mp4,vc_h264', type: 'video/mp4', extension: 'mp4' },
] as const

/** Cadena de transformación de UNA rendición de vídeo (sin la URL base). */
function videoTransformation(
  profile: VideoProfile,
  size: VideoSize,
  format: (typeof VIDEO_FORMATS)[number],
) {
  const { quality, audio } = VIDEO_PROFILES[profile]
  const dimensions =
    size.height === undefined
      ? `w_${size.width}`
      : `w_${size.width},h_${size.height}`

  // Un componente por acción y f_/q_ al final, como en los ejemplos de la
  // propia documentación de Cloudinary (`ac_none/c_limit,.../f_auto/q_auto`).
  return [
    ...(audio ? [] : ['ac_none']),
    `c_limit,${dimensions}`,
    format.transformation,
    `q_${quality}`,
  ].join('/')
}

/**
 * Cadenas de transformación de las dos rendiciones de un vídeo, EN EL ORDEN
 * de `<source>`. Es lo que la fase 2 pasará al `eager` de la API `explicit`
 * (§9): una sola fuente de verdad entre la entrega y el calentamiento.
 */
export function buildVideoTransformations(
  profile: VideoProfile,
  size: VideoSize,
): string[] {
  return VIDEO_FORMATS.map((f) => videoTransformation(profile, size, f))
}

/**
 * Las dos fuentes de un `<video>` (WebM/VP9 y MP4/H.264), con el tamaño
 * acotado por el perfil y el escalón pedidos.
 */
export function buildVideoSources(
  publicId: string,
  profile: VideoProfile,
  size: VideoSize,
): VideoSource[] {
  return VIDEO_FORMATS.map((format) => ({
    src: `${baseUrl('video')}/${videoTransformation(profile, size, format)}/${publicId}.${format.extension}`,
    type: format.type,
  }))
}

/** Fuentes del vídeo de un pin en el feed: un solo ancho (480), mudo. */
export function buildFeedVideoSources(publicId: string): VideoSource[] {
  return buildVideoSources(publicId, 'feed', { width: FEED_VIDEO_WIDTH })
}

/**
 * Póster de un vídeo: JPG del primer frame con el tamaño acotado, bajo el
 * recurso video (no image). Con `height` (póster de la ficha) usa el mismo
 * tamaño que el escalón del vídeo, para que nunca se vea un póster más
 * borroso que el vídeo. `context` decide la calidad igual que en las
 * imágenes: el póster del feed sigue la calidad del feed (eco) y el de las
 * fichas la de detalle. Es obligatorio a propósito: un olvido serviría el
 * póster del feed con la calidad equivocada sin que nada avise.
 */
export function buildVideoPosterUrl(
  publicId: string,
  size: VideoSize,
  context: MediaContext,
) {
  const quality = IMAGE_DELIVERY[context].quality
  const dimensions =
    size.height === undefined
      ? `w_${size.width}`
      : `w_${size.width},h_${size.height}`

  return `${baseUrl('video')}/q_${quality},f_jpg,${dimensions},c_limit/${publicId}.jpg`
}

/** srcset del póster en el feed: la misma escalera que las imágenes (320/480/640). */
export function buildVideoPosterSrcSet(publicId: string) {
  return IMAGE_DELIVERY.feed.widths
    .map((w) => `${buildVideoPosterUrl(publicId, { width: w }, 'feed')} ${w}w`)
    .join(', ')
}
