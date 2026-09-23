'use client'

import { PinCard } from '@/components/pin/PinCard'
import { useFeed } from './useFeed'
import styles from './Feed.module.css'
import type { FeedBatchResult } from '@/modules/feed/application/getFeedSessionBatch'

/**
 * Retícula masonry sobre el feed real (§6-§10 de la arquitectura), para
 * la home (scope="home") y cada subhome (scope="work"/"insights"/
 * "tools"/"channel").
 */
export function Feed({
  scope,
}: {
  scope: string
}) {
  const {
    containerRef,
    positioned,
    totalHeight,
    isLoading,
    itemCount,
    hasMore,
    error,
    sentinelId,
  } = useFeed(scope)

  if (error) {
    return (
      <p
        className={
          styles.status
        }
      >
        No se ha podido
        cargar el feed.
        Recarga la página.
      </p>
    )
  }

  return (
    <div
      className={
        styles.wrapper
      }
    >
      <div
        ref={
          containerRef
        }
        className={
          styles.container
        }
        style={{
          height:
            totalHeight,
        }}
      >
        {positioned.map(
          (p) =>
            p.mounted ? (
              <PinCard
                key={
                  p.item
                    .pinId
                }
                pin={
                  p.item
                }
                style={{
                  x:
                    p.x,

                  y:
                    p.y,

                  width:
                    p.width,

                  height:
                    p.height,
                }}
            analyticsContext={{
  section: scope,

  destinationType:
    (
      p.item as FeedBatchResult['items'][number]
    ).kind,
}}
              />
            ) : (
              <div
                key={
                  p.item
                    .pinId
                }
                className={
                  styles.spacer
                }
                style={{
                  transform:
                    `translate(${p.x}px, ${p.y}px)`,

                  width:
                    p.width,

                  height:
                    p.height,
                }}
              />
            ),
        )}
      </div>

      <div
        id={
          sentinelId
        }
        className={
          styles.sentinel
        }
      />

      {isLoading &&
        itemCount ===
          0 && (
          <p
            className={
              styles.status
            }
          >
            Cargando…
          </p>
        )}

      {!isLoading &&
        itemCount ===
          0 &&
        !hasMore && (
          <p
            className={
              styles.status
            }
          >
            Todavía no hay
            contenido
            publicado en
            esta sección.
          </p>
        )}
    </div>
  )
}