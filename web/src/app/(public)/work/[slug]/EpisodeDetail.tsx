'use client'

import { PinCard } from '@/components/pin/PinCard'
import { useRecommendationMasonry } from '@/components/detail/useRecommendationMasonry'
import type { PublicContent } from '@/modules/content/infrastructure/publicContentSource'
import type { PublicEpisode } from '@/modules/content/infrastructure/publicEpisodeSource'
import styles from './EpisodeDetail.module.css'

// especificacion-final-formato-detalle.md §2, punto 1: "la imagen nunca
// se mide en columnas... igual en tipo A, B y contenido libre, sin
// excepción" — un episodio no tiene un archivo propio del que sacar
// ancho/alto real (es un embed externo), así que se asume 16:9, el
// formato de vídeo estándar de YouTube/Vimeo. Simplificación heredada de
// antes de esta sesión (el .embedWrapper original ya usaba aspect-ratio:
// 16/9 fijo) — no resuelta aquí: un embed de Spotify (audio, widget
// compacto de altura fija) no encaja bien en un marco 16:9, se ve con
// mucho hueco vacío. Sigue siendo una pregunta de diseño abierta para
// cuando se audite Spotify (arquitectura §17.2, Anexo A), no algo que
// este cambio decida.
const EPISODE_RATIO = '16:9' as const

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

/**
 * Plantilla de detalle tipo B para un episodio — mismo mecanismo que
 * CaseDetail (fullWidthContent, sin panel lateral, recomendaciones solo
 * debajo), con el embed externo en vez de un carrusel propio.
 */
export function EpisodeDetail({
  content,
  episode,
}: {
  content: PublicContent
  episode: PublicEpisode
}) {
  const {
    containerRef,
    contentBlockImageWidth,
    contentBlockImageHeight,
    contentBlockReservedWidth,
    totalHeight,
    positioned,
    isLoading,
    itemCount,
    hasMore,
    error,
    sentinelId,
  } = useRecommendationMasonry(content.id, EPISODE_RATIO, {
    fullWidthContent: true,
  })

  return (
    <article className={styles.article}>
      <div
        ref={containerRef}
        className={styles.canvas}
        style={{ height: totalHeight || undefined }}
      >
        <div
          className={styles.contentBlock}
          style={{ width: contentBlockReservedWidth || '100%' }}
        >
          <div
            className={styles.embedWrapper}
            style={{
              width: contentBlockImageWidth || '100%',
              height: contentBlockImageHeight || undefined,
            }}
          >
            <iframe
              src={embedUrl(episode)}
              title={content.title}
              className={styles.embed}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className={styles.text}>
            <p className={styles.kind}>
              {episodeKindLabel(episode.episodeKind)}
            </p>
            <h1 className={styles.title}>{content.title}</h1>
            {content.highlight && (
              <p className={styles.highlight}>{content.highlight}</p>
            )}
            {content.body && <p className={styles.body}>{content.body}</p>}
          </div>
        </div>

        {positioned.map((p) => (
          <PinCard
            key={p.item.pinId}
            pin={p.item}
            style={{ x: p.x, y: p.y, width: p.width, height: p.height }}
          />
        ))}
      </div>

      <div id={sentinelId} className={styles.sentinel} />

      {error && <p className={styles.status}>{error}</p>}
      {isLoading && itemCount === 0 && (
        <p className={styles.status}>Cargando recomendaciones…</p>
      )}
      {!isLoading && itemCount === 0 && !hasMore && (
        <p className={styles.status}>
          Todavía no hay contenido publicado para recomendar.
        </p>
      )}
    </article>
  )
}
