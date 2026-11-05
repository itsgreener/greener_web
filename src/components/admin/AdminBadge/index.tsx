import { cx } from '@/lib/cx'
import { contentStatusLabel } from '@/components/admin/contentLabels'
import type { ContentStatus } from '@/modules/shared/domain/contentStatus'

import styles from './AdminBadge.module.css'

/** Insignia genérica: el tipo de contenido, el estado de un candidato… */
export function AdminBadge({
  tone = 'brand',
  children,
}: {
  tone?: 'brand' | 'neutral'
  children: React.ReactNode
}) {
  return <span className={cx(styles.badge, styles[tone])}>{children}</span>
}

/** Borrador, programado o publicado, con su color y su texto. */
export function AdminStatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span className={cx(styles.badge, styles[status])}>
      {contentStatusLabel(status)}
    </span>
  )
}

/** Código de idioma (ES, EN, CA) en cuadrado. */
export function AdminLocaleBadge({ children }: { children: React.ReactNode }) {
  return <span className={cx(styles.badge, styles.locale)}>{children}</span>
}
