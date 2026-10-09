import type { EpisodeProvider } from './episodeSchema'

/**
 * Dónde se ve/escucha un episodio en su plataforma (CTA «Watch more» de la
 * ficha, especificacion-final-formato-detalle.md §1 y §7: «no es un campo,
 * sale automático según `provider`»). Es un ENLACE, no un embed: abrirlo no
 * carga nada de terceros en nuestra página.
 *
 * El `embedId` es el que ya se guarda para el embed: el id del vídeo de
 * YouTube, el del vídeo de Vimeo o el del episodio de Spotify (mismo
 * supuesto que embedUrl en EpisodeDetail: un episodio, no un show).
 */

export const EPISODE_CTA_LABEL = 'Watch more'

export function episodeExternalUrl(
  provider: EpisodeProvider,
  embedId: string,
): string {
  const id = encodeURIComponent(embedId)

  switch (provider) {
    case 'youtube':
      return `https://www.youtube.com/watch?v=${id}`
    case 'vimeo':
      return `https://vimeo.com/${id}`
    case 'spotify':
      return `https://open.spotify.com/episode/${id}`
  }
}
