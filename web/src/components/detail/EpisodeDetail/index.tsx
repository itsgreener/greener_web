'use client'

import {
  CloudinaryImage,
  DETAIL_IMAGE_SIZES,
} from '@/components/media/CloudinaryImage'
import {
  embedProviderLabel,
  episodeEmbedKey,
  episodeEmbedUrl,
} from '@/modules/content/domain/episodeEmbed'
import { episodeKindLabel } from '@/modules/content/domain/episodeLabels'
import {
  EPISODE_CTA_LABEL,
  episodeExternalUrl,
} from '@/modules/content/domain/episodeLinks'

import { CtaAnchor } from '@/components/cta/Cta'
import { EmbedConsentPrompt } from '@/components/detail/EmbedConsentPrompt'
import { RecommendationsGrid } from '@/components/detail/RecommendationsGrid'
import { useEmbedPlayback } from '@/components/detail/useEmbedPlayback'
import { useRecommendationMasonry } from '@/components/detail/useRecommendationMasonry'
import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
import { isPreviewRequest } from '@/modules/analytics/previewRequest'
import type {
  PublicContent,
  PublicContentMedia,
  PublicEpisode,
} from '@/modules/content/domain/publicContent'
import { detailVideoRungM } from '@/modules/media/domain/mediaDelivery'
import styles from './EpisodeDetail.module.css'

// especificacion-final-formato-detalle.md §2, punto 1: "la imagen nunca
// se mide en columnas... igual en tipo A, B y contenido libre, sin
// excepción" — un episodio no tiene un archivo propio del que sacar
// ancho/alto real (es un embed externo), así que se asume 16:9, el
// formato de vídeo estándar de YouTube. Simplificación heredada de
// antes de esta sesión (el .embedWrapper original ya usaba aspect-ratio:
// 16/9 fijo) — no resuelta aquí: un embed de Spotify (audio, widget
// compacto de altura fija) no encaja bien en un marco 16:9, se ve con
// mucho hueco vacío. Sigue siendo una pregunta de diseño abierta para
// cuando se audite Spotify (arquitectura §17.2, Anexo A), no algo que
// este cambio decida.
const EPISODE_RATIO = '16:9' as const

/**
 * Portada previa al reproductor: la primera imagen 16:9 de los pines del
 * episodio o, sin ella, el primer pin (`episodePoster`), servida por
 * Cloudinary con las mismas cadenas del contrato de medios que usa la ficha
 * de tool (imagen de detalle; póster de vídeo en el escalón M). No hace
 * ninguna petición a YouTube ni a Spotify.
 */
function EpisodePoster({ media }: { media: PublicContentMedia | null }) {
  if (!media) return null

  return (
    <CloudinaryImage
      publicId={media.cloudinaryPublicId}
      kind={media.kind}
      profile="detail"
      posterSize={detailVideoRungM(EPISODE_RATIO)}
      responsive={media.kind === 'image'}
      sizes={DETAIL_IMAGE_SIZES}
      alt=""
      className={styles.poster}
    />
  )
}

/**
 * Plantilla de detalle tipo B para un episodio — mismo mecanismo que
 * CaseDetail (fullWidthContent, sin panel lateral, recomendaciones solo
 * debajo) y con el embed externo en vez de un carrusel propio.
 */
export function EpisodeDetail({
  content,
  episode,
  poster = null,
}: {
  content: PublicContent
  episode: PublicEpisode
  // Imagen 16:9 del episodio (o el primer pin): portada previa al reproductor.
  poster?: PublicContentMedia | null
}) {
  const provider = embedProviderLabel(episode.provider)

  const recommendations = useRecommendationMasonry(content.id, EPISODE_RATIO, {
    fullWidthContent: true,
  })
  const { contentBlockImageWidth, contentBlockImageHeight } = recommendations

  /**
   * Registra "Episode Play" (arquitectura §18.2) en el clic que monta el
   * reproductor: es la acción explícita de reproducir, uniforme entre los dos
   * proveedores (YouTube y Spotify; Vimeo se retiró el 13 oct 2026). Una vista
   * previa firmada no debe contaminar las métricas públicas (mismo criterio
   * que ContentOpenTracker, pero aquí no hay montaje propio que lo dispare:
   * el evento nace del clic, no de abrir la página).
   */
  function trackPlay() {
    if (isPreviewRequest()) return

    trackAnalyticsEvent(
      'Episode Play',
      {
        program: episode.program,
        episodeId: content.id,
        provider: episode.provider,
      },
      { interactive: true },
    )
  }

  const { canRenderEmbed, askingConsent, play, acceptAndPlay, cancel } =
    useEmbedPlayback({
      embedKey: episodeEmbedKey(episode.provider, episode.embedId),
      onPlay: trackPlay,
    })

  return (
    <article className={styles.article}>
      <div className={styles.contentBlock}>
        <div
          className={styles.embedWrapper}
          style={{
            width: contentBlockImageWidth || '100%',
            height: contentBlockImageHeight || undefined,
          }}
        >
          {canRenderEmbed ? (
            <iframe
              src={episodeEmbedUrl(episode.provider, episode.embedId)}
              title={content.title}
              className={styles.embed}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <>
              <EpisodePoster media={poster} />
              {askingConsent ? (
                <EmbedConsentPrompt
                  provider={provider}
                  onAccept={acceptAndPlay}
                  onCancel={cancel}
                />
              ) : (
                <button
                  type="button"
                  className={styles.playButton}
                  onClick={play}
                  aria-label={`Play on ${provider}`}
                >
                  <span className={styles.playIcon} aria-hidden="true" />
                </button>
              )}
            </>
          )}
        </div>

        <div className={styles.text}>
          {/* Dos grupos (diseño, 5 oct 2026): arriba tipo de episodio y
              título; debajo highlight y cuerpo, algo más separados entre
              sí que los elementos de cada grupo. El CTA va al final,
              abajo a la derecha de la columna. */}
          <div className={styles.heading}>
            <p className={styles.kind}>
              {episodeKindLabel(episode.episodeKind)}
            </p>
            <h1 className={`${styles.title} text-display`}>{content.title}</h1>
          </div>

          {(content.highlight || content.body) && (
            <div className={styles.details}>
              {content.highlight && (
                <p className={styles.highlight}>{content.highlight}</p>
              )}
              {content.body && <p className={styles.body}>{content.body}</p>}
            </div>
          )}

          {/* Segundo CTA (spec §1/§7, hasta hoy sin implementar): lleva al
              episodio en su plataforma. Enlace externo en pestaña nueva;
              no carga nada de terceros en esta página. */}
          <CtaAnchor
            href={episodeExternalUrl(episode.provider, episode.embedId)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cta}
            aria-label={`${EPISODE_CTA_LABEL} on ${provider} (opens in a new tab)`}
          >
            {EPISODE_CTA_LABEL}
          </CtaAnchor>
        </div>
      </div>

      <RecommendationsGrid recommendations={recommendations} />
    </article>
  )
}
