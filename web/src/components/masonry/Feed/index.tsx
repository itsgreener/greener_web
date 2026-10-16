'use client'

import { PinCard } from '@/components/pin/PinCard'
import { NewsletterPinCard } from '@/components/newsletter/NewsletterPinCard'
import { isNewsletterItem } from '@/modules/feed/domain/feedReadModels'
import { feedCopy } from '@/components/masonry/copy'
import { useFeed } from './useFeed'
import styles from './Feed.module.css'

/**
 * Retícula masonry sobre el feed real (§6-§10 de la arquitectura), para
 * la home (scope="home") y cada subhome (scope="work"/"insights"/
 * "tools"/"channel"). Habla con /api/feed/sessions + /api/feed/[sessionId].
 */
export function Feed({ scope }: { scope: string }) {
  const {
    containerRef,
    positioned,
    totalHeight,
    isLoading,
    itemCount,
    hasMore,
    error,
    sentinelRef,
    retireNewsletterCards,
  } = useFeed(scope)

  if (error) {
    return <p className={styles.status}>{feedCopy.loadError}</p>
  }

  return (
    <div className={styles.wrapper}>
      <div
        ref={containerRef}
        className={styles.container}
        style={{ height: totalHeight }}
      >
        {positioned.map((p) =>
          p.mounted ? (
            isNewsletterItem(p.item) ? (
              <NewsletterPinCard
                key={p.key}
                item={p.item}
                style={{ x: p.x, y: p.y, width: p.width, height: p.height }}
                onSubscribed={retireNewsletterCards}
              />
            ) : (
              <PinCard
                key={p.key}
                pin={p.item}
                instanceId={p.key}
                style={{ x: p.x, y: p.y, width: p.width, height: p.height }}
                analyticsContext={{
                  section: scope,
                  destinationType: p.item.kind,
                }}
              />
            )
          ) : (
            // Espaciador: conserva la posición de scroll sin mantener la
            // imagen en el DOM (arquitectura §10.2).
            <div
              key={p.key}
              className={styles.spacer}
              style={{
                transform: `translate(${p.x}px, ${p.y}px)`,
                width: p.width,
                height: p.height,
              }}
            />
          ),
        )}
      </div>
      <div ref={sentinelRef} className={styles.sentinel} />
      {isLoading && itemCount === 0 && (
        <p className={styles.status}>{feedCopy.loading}</p>
      )}
      {!isLoading && itemCount === 0 && !hasMore && (
        <p className={styles.status}>{feedCopy.empty}</p>
      )}
    </div>
  )
}
