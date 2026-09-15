import type { PublicContent } from '@/modules/content/infrastructure/publicContentSource'
import type { PublicEpisode } from '@/modules/content/infrastructure/publicEpisodeSource'
import styles from './EpisodeDetail.module.css'

/**
 * https://www.youtube.com/embed vs youtube-nocookie: arquitectura §17.2
 * ("YouTube usa youtube-nocookie cuando sea viable"). Vimeo y Spotify no
 * tienen una variante sin cookies equivalente documentada — se auditará
 * el consentimiento real cuando se aborde §17.2 del todo (Anexo A,
 * decisión pendiente con Greener).
 */
function embedUrl(episode: PublicEpisode): string {
  switch (episode.provider) {
    case 'youtube':
      return `https://www.youtube-nocookie.com/embed/${episode.embedId}`
    case 'vimeo':
      return `https://player.vimeo.com/video/${episode.embedId}`
    case 'spotify':
      // Mejor suposición: episode_kind hoy solo vale 'podcast', así que se
      // asume un episodio de Spotify, no un show completo — a confirmar
      // si algún día se sube contenido que no encaje aquí.
      return `https://open.spotify.com/embed/episode/${episode.embedId}`
  }
}

function episodeKindLabel(kind: PublicEpisode['episodeKind']): string {
  switch (kind) {
    case 'podcast':
      return 'Podcast'
  }
}

export function EpisodeDetail({
  content,
  episode,
}: {
  content: PublicContent
  episode: PublicEpisode
}) {
  return (
    <article className={styles.article}>
      <div className={styles.embedWrapper}>
        <iframe
          src={embedUrl(episode)}
          title={content.title}
          className={styles.embed}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>

      <div className={styles.text}>
        <p className={styles.kind}>{episodeKindLabel(episode.episodeKind)}</p>
        <h1 className={styles.title}>{content.title}</h1>
        {content.highlight && (
          <p className={styles.highlight}>{content.highlight}</p>
        )}
        {content.body && <p className={styles.body}>{content.body}</p>}
      </div>
    </article>
  )
}
