'use client'

import { episodeKindLabel } from '@/modules/content/domain/episodeLabels'
import {
  EPISODE_CTA_LABEL,
  episodeExternalUrl,
} from '@/modules/content/domain/episodeLinks'
import { useState } from 'react'
import Link from 'next/link'

import { RecommendationsGrid } from '@/components/detail/RecommendationsGrid'
import { useRecommendationMasonry } from '@/components/detail/useRecommendationMasonry'
import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
import { useConsent } from '@/modules/consent/client/ConsentProvider'
import type {
  PublicContent,
  PublicContentMedia,
  PublicEpisode,
} from '@/modules/content/domain/publicContent'
import {
  buildImageSrcSet,
  buildImageUrl,
  buildVideoPosterUrl,
} from '@/modules/media/client/cloudinaryUrl'
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
 * https://www.youtube.com/embed vs youtube-nocookie: arquitectura §17.2
 * ("YouTube usa youtube-nocookie cuando sea viable"). Spotify no tiene una
 * variante sin cookies equivalente. Vimeo se retiró el 13 oct 2026.
 *
 * `autoplay=1` en YouTube: con el consentimiento por delante
 * (nada se monta sin un «sí» y un clic previo), pulsar play en la portada
 * ya ES la intención explícita de reproducir — sin autoplay el visitante
 * tendría que pulsar play una segunda vez dentro del propio iframe.
 * Spotify no admite ese parámetro en su embed.
 */
function embedUrl(episode: PublicEpisode): string {
  switch (episode.provider) {
    case 'youtube':
      return `https://www.youtube-nocookie.com/embed/${episode.embedId}?autoplay=1`
    case 'spotify':
      // Mejor suposición: episode_kind hoy solo vale 'podcast', así que se
      // asume un episodio de Spotify, no un show completo — a confirmar
      // si algún día se sube contenido que no encaje aquí.
      return `https://open.spotify.com/embed/episode/${episode.embedId}`
  }
}

function providerLabel(provider: PublicEpisode['provider']): string {
  switch (provider) {
    case 'youtube':
      return 'YouTube'
    case 'spotify':
      return 'Spotify'
  }
}

// NINGÚN embed de tercero se monta hasta que hay un «sí» a las cookies Y el
// visitante pulsa play. Cargar el iframe ya es instalar las cookies del
// proveedor (YouTube escribe un identificador en el almacenamiento local al
// cargar; Spotify planta cookies desde la carga), así que antes de eso solo
// hay una portada de Greener (la imagen 16:9 del episodio, en Cloudinary) y un
// botón de play. Quien ya aceptó carga el reproductor con ese clic, sin
// volver a preguntar; quien rechazó, o aún no ha decidido, ve la petición en
// ese momento y, si acepta, queda aceptado para toda la web (se puede
// revocar desde «Privacy & Cookies» en el menú lateral). Revocar desmonta el
// reproductor al instante. La guía de la AEPD (mayo de 2024, §3.2.3 d)
// reconoce pedir el consentimiento justo antes de descargar un vídeo.

/**
 * Portada previa al reproductor: la primera imagen 16:9 de los pines del
 * episodio o, sin ella, el primer pin (`episodePoster`), servida por
 * Cloudinary con las mismas cadenas del contrato de medios que usa la ficha
 * de tool (imagen de detalle; póster de vídeo en el escalón M). No hace
 * ninguna petición a YouTube ni a Spotify.
 */
function EpisodePoster({ media }: { media: PublicContentMedia | null }) {
  if (!media) return null

  const src =
    media.kind === 'image'
      ? buildImageUrl(media.cloudinaryPublicId, 'detail')
      : buildVideoPosterUrl(
          media.cloudinaryPublicId,
          detailVideoRungM(EPISODE_RATIO),
          'detail',
        )

  return (
    // URL ya transformada por modules/media/client/cloudinaryUrl.ts
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={
        media.kind === 'image'
          ? buildImageSrcSet(media.cloudinaryPublicId, 'detail')
          : undefined
      }
      sizes="83vw"
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
  const { status, accept } = useConsent()
  const [approvedEmbedKey, setApprovedEmbedKey] = useState<string | null>(null)
  const [askingConsent, setAskingConsent] = useState(false)
  const embedKey = `${episode.provider}:${episode.embedId}`
  // Aceptar es condición para que haya reproductor, no solo para montarlo:
  // si el visitante revoca el consentimiento, el iframe se desmonta.
  const canRenderEmbed = approvedEmbedKey === embedKey && status === 'accepted'
  const provider = providerLabel(episode.provider)

  const recommendations = useRecommendationMasonry(content.id, EPISODE_RATIO, {
    fullWidthContent: true,
  })
  const { contentBlockImageWidth, contentBlockImageHeight } = recommendations

  /**
   * Registra "Episode Play" (arquitectura §18.2) en el clic que monta el
   * reproductor — es la acción explícita de reproducir, uniforme entre los
   * tres proveedores. Un preview firmado no debe contaminar las métricas
   * públicas (mismo criterio que ContentOpenTracker, pero aquí no hay
   * montaje propio que lo dispare: el evento nace del clic, no de abrir la
   * página).
   */
  function startPlayback() {
    const isPreview = new URLSearchParams(window.location.search).has('preview')

    if (!isPreview) {
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

    setAskingConsent(false)
    setApprovedEmbedKey(embedKey)
  }

  function handlePlayClick() {
    if (status === 'accepted') {
      startPlayback()
      return
    }

    setAskingConsent(true)
  }

  function handleAcceptAndPlay() {
    accept()
    startPlayback()
  }

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
              src={embedUrl(episode)}
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
                <div className={styles.embedConsent}>
                  <p className={styles.embedConsentTitle}>{provider} content</p>
                  <p className={styles.embedConsentText}>
                    This content is served by {provider}. Nothing is loaded from{' '}
                    {provider} until you accept cookies. If you accept, your
                    browser connects to {provider}, which receives your IP
                    address and uses cookies and similar technologies of its own
                    to deliver the player and for its own purposes, as described
                    in its privacy policy.
                  </p>
                  <p className={styles.embedConsentText}>
                    Your choice is remembered, and you can change it at any time
                    on the Privacy &amp; Cookies page.{' '}
                    <Link href="/privacy#cookies" target="_blank" rel="noopener">
                      Privacy &amp; Cookies
                    </Link>
                  </p>
                  <div className={styles.embedConsentActions}>
                    <button
                      type="button"
                      className={styles.embedConsentButton}
                      onClick={handleAcceptAndPlay}
                    >
                      Accept cookies and play
                    </button>
                    <button
                      type="button"
                      className={styles.embedConsentSecondary}
                      onClick={() => setAskingConsent(false)}
                    >
                      Not now
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.playButton}
                  onClick={handlePlayClick}
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
          <a
            href={episodeExternalUrl(episode.provider, episode.embedId)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cta}
            aria-label={`${EPISODE_CTA_LABEL} on ${provider} (opens in a new tab)`}
          >
            {EPISODE_CTA_LABEL}
          </a>
        </div>
      </div>

      <RecommendationsGrid recommendations={recommendations} />
    </article>
  )
}
