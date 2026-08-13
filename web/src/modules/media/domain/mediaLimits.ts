/**
 * Reglas de negocio de subida de imagen y vídeo (Política de subida y
 * almacenamiento de contenido multimedia). Puras: no dependen de
 * Cloudinary, Supabase ni Next.js, para poder testearse de forma aislada
 * (arquitectura §24.4 — capa domain/).
 */

export const IMAGE_LIMITS = {
  maxSizeBytes: 5 * 1024 * 1024, // 5 MB
  recommendedFormats: ["webp", "avif"] as const,
} as const;

export const VIDEO_LIMITS = {
  maxSizeBytes: 100 * 1024 * 1024, // 100 MB
  maxDurationSeconds: 180, // 3 minutos
  recommendedFormat: "mp4",
  recommendedCodec: "h264",
} as const;

export type MediaValidationError =
  | { code: "IMAGE_TOO_LARGE"; maxBytes: number }
  | { code: "VIDEO_TOO_LARGE"; maxBytes: number }
  | { code: "VIDEO_TOO_LONG"; maxSeconds: number };

/**
 * Valida un original de imagen contra el límite de subida (5 MB).
 * No valida el peso servido al usuario: ese lo resuelve la transformación
 * de Cloudinary en el momento de entrega (ver mediaDelivery.ts).
 */
export function validateImageUpload(sizeBytes: number): MediaValidationError | null {
  if (sizeBytes > IMAGE_LIMITS.maxSizeBytes) {
    return { code: "IMAGE_TOO_LARGE", maxBytes: IMAGE_LIMITS.maxSizeBytes };
  }
  return null;
}

/**
 * Valida un original de vídeo contra el límite de subida (100 MB) y de
 * duración (3 minutos).
 */
export function validateVideoUpload(
  sizeBytes: number,
  durationSeconds: number
): MediaValidationError | null {
  if (sizeBytes > VIDEO_LIMITS.maxSizeBytes) {
    return { code: "VIDEO_TOO_LARGE", maxBytes: VIDEO_LIMITS.maxSizeBytes };
  }
  if (durationSeconds > VIDEO_LIMITS.maxDurationSeconds) {
    return { code: "VIDEO_TOO_LONG", maxSeconds: VIDEO_LIMITS.maxDurationSeconds };
  }
  return null;
}
