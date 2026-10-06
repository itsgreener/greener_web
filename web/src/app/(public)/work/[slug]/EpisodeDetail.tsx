'use client'

import { episodeKindLabel } from '@/modules/content/domain/episodeLabels'
import {
  EPISODE_CTA_LABEL,
  episodeExternalUrl,
} from '@/modules/content/domain/episodeLinks'
import { useState } from 'react'
import Link from 'next/link'

import { PinCard } from '@/components/pin/PinCard'
import { useRecommendationMasonry } from '@/components/detail/useRecommendationMasonry'
import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
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
 *
 * `autoplay=1` en YouTube y Vimeo (añadido el 29 sep): con el gate de
 * consentimiento delante (nada se monta sin un clic previo), pulsar
 * «Load … content» ya ES la intención explícita de reproducir — sin
 * autoplay el visitante tendría que pulsar play una segunda vez dentro
 * del propio iframe. Spotify no admite ese parámetro en su embed.
 */
function embedUrl(episode: PublicEpisode): string {
  switch (episode.provider) {
    case 'youtube':
      return `https://www.youtube-nocookie.com/embed/${episode.embedId}?autoplay=1`
    case 'vimeo':
      // dnt=1 (Do Not Track): evita que Vimeo plante la cookie `vuid`
      // (identificador persistente de dos años) desde la carga, antes
      // de cualquier interacción — arquitectura §17.2, auditoría de
      // cookies. Vimeo no ofrece un dominio "sin cookies" equivalente
      // al youtube-nocookie de arriba; este parámetro es la única
      // mitigación técnica que expone.
      return `https://player.vimeo.com/video/${episode.embedId}?dnt=1&autoplay=1`
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
    case 'vimeo':
      return 'Vimeo'
    case 'spotify':
      return 'Spotify'
  }
}

// Decisión del 28 de septiembre (cookies, opción A): NINGÚN embed de tercero
// se carga hasta que el usuario pulsa «Load {proveedor} content», tampoco
// YouTube (antes se servía directo por youtube-nocookie, que sigue siendo la
// URL, pero que según la auditoría del 22-23 sep escribe un identificador en
// el almacenamiento local al cargar). La guía de cookies de la AEPD (mayo de
// 2024, §3.2.3 d) reconoce pedir el consentimiento justo antes de descargar
// un vídeo. La elección NO se guarda (ni cookie ni almacenamiento): se
// vuelve a preguntar en cada vídeo, y así el sitio no escribe nada propio
// que haya que justificar. Si más adelante se pasa a un banner global, esta
// puerta se sustituye por su estado. Un test fija que no se persiste nada.

/**
 * Plantilla de detalle tipo B para un episodio — mismo mecanismo que
 * CaseDetail (fullWidthContent, sin panel lateral, recomendaciones solo
 * debajo), con scope='channel' para recomendar únicamente episodios y
 * con el embed externo en vez de un carrusel propio.
 */
export function EpisodeDetail({
  content,
  episode,
}: {
  content: PublicContent
  episode: PublicEpisode
}) {
  const [approvedEmbedKey, setApprovedEmbedKey] = useState<string | null>(null)
  const embedKey = `${episode.provider}:${episode.embedId}`
  const canRenderEmbed = approvedEmbedKey === embedKey
  const provider = providerLabel(episode.provider)

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
    scope: 'channel',
  })

  /**
   * Registra "Episode Play" (arquitectura §18.2) en el mismo clic que
   * concede el consentimiento — es la acción explícita de reproducir,
   * uniforme entre los tres proveedores. Un preview firmado no debe
   * contaminar las métricas públicas (mismo criterio que
   * ContentOpenTracker, pero aquí no hay montaje propio que lo dispare:
   * el evento nace del clic, no de abrir la página).
   */
  function handlePlay() {
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

    setApprovedEmbedKey(embedKey)
  }

  return (
    <article className={styles.article}>
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
            <div className={styles.embedConsent}>
              <p className={styles.embedConsentTitle}>{provider} content</p>
              <p className={styles.embedConsentText}>
                This content is served by {provider}. Nothing is loaded from{' '}
                {provider} until you choose to. If you load it, your browser
                connects to {provider}, which receives your IP address and uses
                cookies and similar technologies of its own to deliver the
                player and for its own purposes, as described in its privacy
                policy.
              </p>
              <p className={styles.embedConsentText}>
                We do not store your choice, so you will be asked again for each
                video.{' '}
                <Link href="/privacy" target="_blank" rel="noopener">
                  Privacy &amp; Cookies
                </Link>
              </p>
              <button
                type="button"
                className={styles.embedConsentButton}
                onClick={handlePlay}
              >
                Load {provider} content
              </button>
            </div>
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

      <div
        ref={containerRef}
        className={styles.canvas}
        style={{ height: totalHeight || undefined }}
      >
        {positioned.map((p) => (
          <PinCard
            key={p.item.pinId}
            pin={p.item}
            style={{ x: p.x, y: p.y, width: p.width, height: p.height }}
            analyticsContext={{
              section: 'recommendations',
              destinationType: p.item.kind,
            }}
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
