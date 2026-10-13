import styles from './PinCard.module.css'

/**
 * Rótulo bajo el medio. Con `displayTitle` (case, episode, insight, tool)
 * son dos líneas; si no, el gancho escrito por el admin (other).
 */
export function PinCardLabel({
  displayTitle,
  displaySecondary,
  label,
}: {
  displayTitle?: string | null
  displaySecondary?: string | null
  label: string | null
}) {
  if (!displayTitle && !label) return null

  return (
    <div className={styles.label}>
      {displayTitle ? (
        <>
          <span className={styles.labelPrimary}>{displayTitle}</span>

          {displaySecondary && (
            <strong className={styles.labelSecondary}>
              {displaySecondary}
            </strong>
          )}
        </>
      ) : (
        <span className={styles.labelHook}>{label}</span>
      )}
    </div>
  )
}
