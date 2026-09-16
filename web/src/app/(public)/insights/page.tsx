import { AuxNav } from '@/components/nav/AuxNav'
import { Feed } from '@/components/masonry/Feed'
import styles from './page.module.css'

/**
 * Subhome de insights — scope="insights" (arquitectura §8.2: "en
 * subhomes, el 100% de los contenidos del scope forma el universo").
 * Coexiste sin conflicto con insights/[slug]/page.tsx (el detalle).
 */
export default function InsightsPage() {
  return (
    <div className={styles.page}>
      <AuxNav />
      <Feed scope="insights" />
    </div>
  )
}
