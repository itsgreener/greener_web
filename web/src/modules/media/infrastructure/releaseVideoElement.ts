/**
 * Suelta de verdad un `<video>` que se va a quitar del DOM: sin esto, un
 * elemento desmontado puede seguir descargando y reteniendo el decodificador
 * hasta que el recolector de basura lo alcance (contrato de medios §6.6).
 * Con `<source>` hijos no basta con quitar el atributo `src`: hay que quitar
 * también los hijos y llamar a `load()`.
 */
export function releaseVideoElement(el: HTMLVideoElement): void {
  try {
    el.pause()
    el.removeAttribute('src')
    el.querySelectorAll('source').forEach((source) => source.remove())
    el.load()
  } catch {
    // jsdom (sin soporte real de medios): nada que soltar.
  }
}
