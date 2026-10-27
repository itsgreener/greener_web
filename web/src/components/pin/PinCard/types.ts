import type { CSSProperties } from 'react'

export interface PinMediaData {
  kind: 'image' | 'video'
  cloudinaryPublicId: string
  // Solo vídeo. Un vídeo más largo que PIN_ANIMATION_LIMITS (p. ej. los de
  // demostración de una tool, hasta 15 s) no se anima en el feed: se queda
  // en su poster. Ausente/null = se desconoce, se anima como siempre.
  durationSeconds?: number | null
}

export interface PinCardData {
  pinId: string
  destination: string
  ratio: string
  // Tool/insight/other: gancho escrito por el admin.
  // Case/episode: siempre llega null; el texto se deriva del contenido.
  label: string | null
  displayTitle?: string | null
  displaySecondary?: string | null
  cta: string | null
  alt: string
  // Solo tiene efecto en un pin de vídeo — ver más abajo.
  autoplayMode: 'viewport' | 'hover' | null
  // Un pin es un único medio (7 oct 2026, §2.41: sin carrusel de pines).
  // Es una lista por compatibilidad con los datos del feed: se usa el
  // primer elemento.
  media: PinMediaData[]
}

export interface PinCardStyle {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Estilo en línea con el que el feed coloca una tarjeta: por `transform`, no
 * por flujo del documento. Es el único sitio que conoce la técnica, así que
 * cambiarla (otro `transform`, `top/left`…) se hace aquí. La altura la fija
 * el contenido de la tarjeta; el espaciador del feed la añade por su cuenta.
 */
export function cardPositionStyle({
  x,
  y,
  width,
}: Pick<PinCardStyle, 'x' | 'y' | 'width'>): CSSProperties {
  return { transform: `translate(${x}px, ${y}px)`, width }
}

/**
 * Evento "Pin Click" (arquitectura §18.2). `tag` queda opcional porque
 * el feed actual todavía no transporta etiquetas por pin — se rellenará
 * el día que exista ese dato, sin tener que tocar quien ya llama a esto.
 */
export interface PinAnalyticsContext {
  section: string
  destinationType: string
  tag?: string
}
