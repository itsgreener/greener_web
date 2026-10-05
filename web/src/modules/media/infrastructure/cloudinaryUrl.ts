import {
  IMAGE_DELIVERY,
  VIDEO_DELIVERY,
  type MediaContext,
} from '../domain/mediaDelivery'

/**
 * Construye URLs de transformación de Cloudinary a partir de las reglas de
 * negocio de modules/media/domain. Es la única pieza que conoce la sintaxis
 * de Cloudinary (arquitectura §24.4 — capa infrastructure/).
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

function baseUrl(resourceType: 'image' | 'video') {
  return `https://res.cloudinary.com/${CLOUD_NAME}/${resourceType}/upload`
}

/**
 * URL de imagen optimizada para feed o detalle: q_auto, f_auto y el ancho
 * más adecuado al contexto (§3 de la política de medios).
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

/**
 * Poster/thumbnail de vídeo para el feed: nunca el archivo completo.
 * jpg del primer frame relevante, redimensionado igual que una imagen.
 */
export function buildVideoPosterUrl(publicId: string) {
  const { widths } = IMAGE_DELIVERY.feed
  const width = widths[widths.length - 1]
  return `${baseUrl('video')}/q_auto,f_jpg,w_${width},c_limit/${publicId}.jpg`
}

/** Preview corto (loop mudo, ver política §1) para pines animados en el feed. */
export function buildVideoPreviewUrl(publicId: string) {
  const seconds = VIDEO_DELIVERY.feed.previewMaxSeconds
  return `${baseUrl('video')}/q_auto,f_auto,du_${seconds}/${publicId}`
}

/** Vídeo completo: solo para página de detalle o reproducción explícita. */
export function buildVideoFullUrl(publicId: string) {
  return `${baseUrl('video')}/q_auto,f_auto/${publicId}`
}

/**
 * Vídeo de la ficha de una tool: mismo q_auto/f_auto que el resto, pero
 * limitado al ancho de entrega que corresponde a la caja del bloque
 * imagen + texto (pickDetailWidth, los mismos anchos que las imágenes de
 * detalle) — nunca el original, que en una grabación de pantalla puede ser
 * 4K. `c_limit` evita ampliar un vídeo más pequeño que ese ancho.
 */
export function buildVideoDetailUrl(publicId: string, width: number) {
  return `${baseUrl('video')}/q_auto,f_auto,w_${width},c_limit/${publicId}`
}
