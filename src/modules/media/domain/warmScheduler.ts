/**
 * Calienta los vídeos de un contenido DESPUÉS de responder a la petición.
 * Nunca lanza ni retrasa la respuesta; si falla, se registra.
 */
export interface WarmScheduler {
  forContent(contentId: string): Promise<void>

  /** Igual, partiendo de un pin (al adjuntarle un vídeo solo se conoce el pin). */
  forPin(pinId: string): Promise<void>
}
