import type { EpisodeProvider } from './episodeSchema'

/**
 * Reproductor embebido de un episodio. Funciones puras: cuál es la URL del
 * iframe, cómo se llama el proveedor y qué clave identifica un embed.
 * (El enlace a la plataforma, que no carga nada de terceros, está en
 * `episodeLinks.ts`.)
 */

/**
 * https://www.youtube.com/embed vs youtube-nocookie: arquitectura §17.2
 * ("YouTube usa youtube-nocookie cuando sea viable"). Spotify no tiene una
 * variante sin cookies equivalente. Vimeo se retiró el 13 oct 2026.
 *
 * `autoplay=1` en YouTube: con el consentimiento por delante (nada se monta
 * sin un «sí» y un clic previo), pulsar play en la portada ya ES la
 * intención explícita de reproducir; sin autoplay el visitante tendría que
 * pulsar play una segunda vez dentro del propio iframe. Spotify no admite ese
 * parámetro en su embed.
 */
export function episodeEmbedUrl(
  provider: EpisodeProvider,
  embedId: string,
): string {
  switch (provider) {
    case 'youtube':
      return `https://www.youtube-nocookie.com/embed/${embedId}?autoplay=1`
    case 'spotify':
      // Mejor suposición: episode_kind hoy solo vale 'podcast', así que se
      // asume un episodio de Spotify, no un show completo; a confirmar si
      // algún día se sube contenido que no encaje aquí.
      return `https://open.spotify.com/embed/episode/${embedId}`
  }
}

/** Nombre del proveedor tal y como se enseña al visitante. */
export function embedProviderLabel(provider: EpisodeProvider): string {
  switch (provider) {
    case 'youtube':
      return 'YouTube'
    case 'spotify':
      return 'Spotify'
  }
}

/**
 * Identifica un embed concreto: la aprobación de un reproductor solo vale
 * para él, no para otro episodio que cargue la misma plantilla.
 */
export function episodeEmbedKey(
  provider: EpisodeProvider,
  embedId: string,
): string {
  return `${provider}:${embedId}`
}
