import type { CSSProperties } from 'react'

export interface PinMediaData {
  kind: 'image' | 'video'
  cloudinaryPublicId: string
  // Solo vídeo. Un vídeo más largo que PIN_ANIMATION_LIMITS (p. ej. los de
  // demostración de una tool, hasta 15 s) no se anima en el feed: se queda
  // en su poster. Ausente/null = se desconoce, se anima como siempre.
  durationSeconds?: number | null
  // Solo en las diapositivas de un carrusel de pines (§2.150): cada una es un
  // pin con su propio alt y su propio modo de autoplay. Ausentes = los del pin.
  alt?: string
  autoplayMode?: 'viewport' | 'hover' | null
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
  // Idioma real de cada texto (`lang` de WCAG 3.1.2). `null` o ausente: es
  // interfaz o un nombre propio y hereda el idioma de la página.
  languages?: {
    title: string | null
    secondary: string | null
    cta: string | null
  }
  alt: string
  // Solo tiene efecto en un pin de vídeo — ver más abajo.
  autoplayMode: 'viewport' | 'hover' | null
  // Un pin es un único medio (7 oct 2026, §2.41): 1 elemento. Con más de uno
  // (2 a 8, mismo ratio) la tarjeta es un carrusel de pines de episodio
  // (§2.150) y cada elemento es una diapositiva.
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

export type PinCardProps = {
  pin: PinCardData
  style: PinCardStyle
  analyticsContext?: PinAnalyticsContext
  /**
   * Identidad de ESTA tarjeta (no la del pin): el mismo pin puede estar
   * montado dos veces a la vez y el coordinador de vídeo indexa por id, así
   * que con `pinId` la segunda tarjeta le pisaba el registro a la primera.
   * Las listas pasan aquí la clave de posición; sin ella se usa el pinId.
   */
  instanceId?: string
}
