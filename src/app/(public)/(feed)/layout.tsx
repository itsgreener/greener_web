import { AuxNav } from '@/components/nav/AuxNav'
import styles from './layout.module.css'

/**
 * Layout común de la home y las subhomes (work, insights, tools, channel):
 * menú auxiliar + feed. Cada página solo decide el scope del feed.
 */
export default function FeedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={styles.page}>
      <AuxNav />
      {children}
    </div>
  )
}
