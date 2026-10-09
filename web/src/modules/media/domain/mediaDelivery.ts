import type { PinRatioValue } from '@/modules/shared/domain/ratio'
/**
 * Contrato de entrega de medios (contrato-medios-fase-1.md §4).
 *
 * Estrategia: separa el original almacenado del recurso realmente servido al
 * usuario. El feed nunca sirve el original: usa versiones con el tamaño
 * acotado. Cloudinary Free (25 créditos) cobra por versiones únicas, así que
 * TODA cadena de entrega sale de las escaleras de este módulo y no se
 * inventa un ancho suelto (`w_189`): cada escalón extra se paga.
 *
 * Este fichero es la única fuente de verdad de los TAMAÑOS y las CALIDADES.
 * La sintaxis de Cloudinary (cómo se escribe cada cosa en la URL) vive en
 * `infrastructure/cloudinaryUrl.ts`, y un test con cadenas exactas protege
 * el contrato completo: cambiar una cadena «un poco» regenera versiones y
 * deja las viejas ocupando almacenamiento (§4.7).
 */

export type MediaContext = 'feed' | 'detail'

/**
 * Calidad de Cloudinary. `auto:eco` y `auto:low` son más agresivas (ficheros
 * más pequeños, calidad algo menor); `auto` es la de referencia.
 */
export type MediaQuality = 'auto' | 'auto:eco' | 'auto:low'

/**
 * Calidades del contrato. PUNTO ÚNICO de la prueba A/B de Greener
 * (contrato-medios-fase-1.md §7 paso 3 y §12). Decidido el 7 oct 2026 tras
 * la prueba real de Greener: `auto:eco` en el feed (imagen, póster y vídeo;
 * también las miniaturas del ABM, que salen por el escalón del feed) y
 * `auto` en las fichas, donde se mira de cerca. Medido: vídeo 720×1280,
 * 744 KB → 424 KB (-43 %, SSIM 0,968); imágenes -10 %/-11 %/-20 % sin
 * diferencia visible. Cambiarlo regenera versiones: se hace de golpe y se
 * despliega ANTES de la carga real de contenido.
 */
export const MEDIA_QUALITY: Record<
  'feedImage' | 'feedVideo' | 'detailVideo',
  MediaQuality
> = {
  feedImage: 'auto:eco',
  feedVideo: 'auto:eco',
  detailVideo: 'auto',
}

export const IMAGE_DELIVERY = {
  feed: {
    // Escalera del feed (contrato §4.2): tope de 640. Con 6 columnas una
    // tarjeta mide ~200-330 px CSS, así que 640 cubre DPR 2.
    widths: [320, 480, 640] as const,
    quality: MEDIA_QUALITY.feedImage,
    format: 'auto' as const,
  },
  detail: {
    widths: [960, 1440, 1920] as const,
    quality: 'auto' as MediaQuality,
    format: 'auto' as const,
  },
} as const

/**
 * Miniaturas del ABM (contrato §4.2): reutilizan el escalón MÁS PEQUEÑO del
 * feed en vez de pedir `w_200` / `w_300` sueltos, versiones que ninguna otra
 * pieza comparte.
 */
export const ADMIN_THUMBNAIL_WIDTH = IMAGE_DELIVERY.feed.widths[0]

function clampDensity(devicePixelRatio: number): number {
  return Math.min(Math.max(devicePixelRatio || 1, 1), 2)
}

/**
 * Ancho de entrega de un medio de detalle (imagen o vídeo) para una caja de
 * `cssWidthPx` píxeles CSS: el menor de los anchos de IMAGE_DELIVERY.detail
 * que cubre la caja a la densidad del dispositivo (con tope de 2×: más
 * densidad no se nota y en vídeo cuesta ancho de banda). Si la caja es más
 * ancha que el mayor, se usa el mayor.
 */
export function pickDetailWidth(
  cssWidthPx: number,
  devicePixelRatio = 1,
): number {
  const widths = IMAGE_DELIVERY.detail.widths
  const needed = Math.max(0, cssWidthPx) * clampDensity(devicePixelRatio)

  return widths.find((w) => w >= needed) ?? widths[widths.length - 1]
}

/**
 * Escalón de la escalera del feed para una tarjeta de `cssWidthPx` px CSS.
 * Es el `src` de reserva de la imagen (el navegador elige del `srcset`);
 * nunca el ancho exacto de la tarjeta, que crearía una versión única por
 * cada ancho de columna (`w_189`, `w_217`…).
 */
export function pickFeedImageWidth(
  cssWidthPx: number,
  devicePixelRatio = 1,
): number {
  const widths = IMAGE_DELIVERY.feed.widths
  const needed = Math.max(0, cssWidthPx) * clampDensity(devicePixelRatio)

  return widths.find((w) => w >= needed) ?? widths[widths.length - 1]
}

/**
 * Ancho ÚNICO del vídeo del feed (contrato §4.4): las tarjetas tienen el
 * mismo ancho en cualquier ratio (el masonry es por columnas). En vertical
 * da más píxeles (480×853 en 9:16); se acepta.
 */
export const FEED_VIDEO_WIDTH = 480

/**
 * Perfiles de entrega de vídeo (contrato §4.2). Un perfil fija la calidad y
 * si se conserva el audio; el tamaño lo pone quien lo pide (feed: un ancho;
 * ficha y caso: un escalón M/L).
 */
export type VideoProfile = 'feed' | 'toolDetail' | 'caseDetail'

export const VIDEO_PROFILES: Record<
  VideoProfile,
  { quality: MediaQuality; audio: boolean }
> = {
  // Pines de tool en el feed: mudos.
  feed: { quality: MEDIA_QUALITY.feedVideo, audio: false },
  // Ficha de tool: muda, con botón de pausa.
  toolDetail: { quality: MEDIA_QUALITY.detailVideo, audio: false },
  // Carrusel de caso y portada de `other`: tienen controles y conservan el
  // audio.
  caseDetail: { quality: MEDIA_QUALITY.detailVideo, audio: true },
}

/**
 * Escalones de vídeo de la ficha (contrato §4.3). Se dimensionan por ÁREA
 * (presupuesto de píxeles), no por ancho: la caja del vídeo en la ficha se
 * dimensiona por altura y su ancho sale del ratio, así que un tope por ancho
 * serviría un 9:16 entero con más del doble de píxeles. M ≈ 0,92 MP y
 * L ≈ 1,44 MP (×1,25 por lado). La entrega usa `c_limit` con ancho y alto.
 */
export type VideoRung = 'M' | 'L'

export interface VideoRungSize {
  width: number
  height: number
}

export const DETAIL_VIDEO_RUNGS: Record<
  PinRatioValue,
  Record<VideoRung, VideoRungSize>
> = {
  '16:9': {
    M: { width: 1280, height: 720 },
    L: { width: 1600, height: 900 },
  },
  '4:3': {
    M: { width: 1104, height: 828 },
    L: { width: 1380, height: 1036 },
  },
  '1:1': {
    M: { width: 960, height: 960 },
    L: { width: 1200, height: 1200 },
  },
  '4:5': {
    M: { width: 856, height: 1070 },
    L: { width: 1070, height: 1338 },
  },
  '3:4': {
    M: { width: 828, height: 1104 },
    L: { width: 1036, height: 1380 },
  },
  '2:3': {
    M: { width: 780, height: 1170 },
    L: { width: 976, height: 1464 },
  },
  '9:16': {
    M: { width: 720, height: 1280 },
    L: { width: 900, height: 1600 },
  },
}

/**
 * Se pasa a L cuando lo necesario supera el lado mayor de M en más de un
 * 9 % (1400/1280). Valor propuesto, ajustable tras probar (§12).
 */
export const DETAIL_VIDEO_L_THRESHOLD = 1.09

/**
 * Escalón de vídeo de la ficha para una caja real.
 *
 * `necesario = ladoMayorDeLaCaja × min(DPR, 2)`; si supera
 * `1,09 × ladoMayor(M)` → L, si no → M. Sin caja medida (0) devuelve M.
 */
export function pickDetailVideoRung({
  ratio,
  boxWidthPx,
  boxHeightPx,
  devicePixelRatio = 1,
}: {
  ratio: PinRatioValue
  boxWidthPx: number
  boxHeightPx: number
  devicePixelRatio?: number
}): { rung: VideoRung } & VideoRungSize {
  const rungs = DETAIL_VIDEO_RUNGS[ratio]
  const longSideOfM = Math.max(rungs.M.width, rungs.M.height)
  const needed =
    Math.max(0, boxWidthPx, boxHeightPx) * clampDensity(devicePixelRatio)

  const rung: VideoRung =
    needed > DETAIL_VIDEO_L_THRESHOLD * longSideOfM ? 'L' : 'M'

  return { rung, ...rungs[rung] }
}

/**
 * Escalón M de un ratio. Lo usan el vídeo del carrusel de caso y la portada
 * de vídeo de contenido libre (contrato §4.2): sin caja medida, conservan
 * el escalón M.
 */
export function detailVideoRungM(ratio: PinRatioValue): VideoRungSize {
  return DETAIL_VIDEO_RUNGS[ratio].M
}
