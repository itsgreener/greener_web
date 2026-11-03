import styles from './PinCard.module.css'

/**
 * Rótulo bajo el medio. Con `displayTitle` (case, episode, insight, tool)
 * son dos líneas; si no, el gancho escrito por el admin (other).
 */
export function PinCardLabel({
  displayTitle,
  displaySecondary,
  label,
  languages,
}: {
  displayTitle?: string | null
  displaySecondary?: string | null
  label: string | null
  // Idioma de cada texto, para `lang`. La interfaz del feed está en inglés.
  languages?: { title: string | null; secondary: string | null }
}) {
  if (!displayTitle && !label) return null

  return (
    <div className={styles.label}>
      {displayTitle ? (
        <>
          <span
            className={styles.labelPrimary}
            lang={languages?.title ?? undefined}
          >
            {displayTitle}
          </span>

          {displaySecondary && (
            <strong
              className={styles.labelSecondary}
              lang={languages?.secondary ?? undefined}
            >
              {displaySecondary}
            </strong>
          )}
        </>
      ) : (
        <span className={styles.labelHook} lang={languages?.title ?? undefined}>
          {label}
        </span>
      )}
    </div>
  )
}
