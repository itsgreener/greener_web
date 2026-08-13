/**
 * Estrategia de entrega de medios: separa el original almacenado del
 * recurso realmente servido al usuario, priorizando bandwidth sobre
 * almacenamiento (política de subida y almacenamiento §3-4).
 *
 * El feed nunca sirve el archivo original: usa versiones optimizadas y,
 * en vídeo, un preview/thumbnail. El original se reserva para la página
 * de detalle o la reproducción explícita.
 */

export type MediaContext = "feed" | "detail";

export const IMAGE_DELIVERY = {
  feed: {
    // Anchos servidos en el feed, alineados con las columnas del masonry
    // (arquitectura §10.1: 2-6 columnas según breakpoint).
    widths: [320, 480, 640, 960] as const,
    quality: "auto" as const,
    format: "auto" as const,
  },
  detail: {
    widths: [960, 1440, 1920] as const,
    quality: "auto" as const,
    format: "auto" as const,
  },
} as const;

export const VIDEO_DELIVERY = {
  feed: {
    // En el feed nunca se sirve el vídeo completo: poster/preview corto.
    mode: "poster_or_preview" as const,
    previewMaxSeconds: 5,
  },
  detail: {
    mode: "full" as const,
  },
} as const;
