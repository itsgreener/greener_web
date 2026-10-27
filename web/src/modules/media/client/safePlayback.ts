/**
 * `play()` y `pause()` de un `<video>` sin que un entorno sin soporte real de
 * medios (jsdom en los tests) o un autoplay bloqueado por el navegador rompan
 * nada: el vídeo se queda en el póster. `play()` puede lanzar de forma
 * síncrona en vez de devolver una promesa rechazada según el entorno, de ahí
 * el `try/catch` además del `.catch`.
 */

/**
 * Reproduce en silencio. `muted` va también como propiedad: el atributo que
 * React serializa no basta en algunos navegadores y, sin el audio silenciado,
 * el autoplay se bloquea. Con `restart`, arranca desde el principio.
 */
export function safePlay(
  el: HTMLVideoElement | null | undefined,
  { restart = false }: { restart?: boolean } = {},
): void {
  if (!el) return

  try {
    el.muted = true
    if (restart && el.currentTime > 0) el.currentTime = 0
    el.play()?.catch(() => {})
  } catch {
    // Autoplay bloqueado o sin soporte de vídeo: se queda en el póster.
  }
}

export function safePause(el: HTMLVideoElement | null | undefined): void {
  if (!el) return

  try {
    el.pause()
  } catch {
    // jsdom (sin soporte real de medios).
  }
}
