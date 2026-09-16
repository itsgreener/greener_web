import { AuxNav } from '@/components/nav/AuxNav'
import { Feed } from '@/components/masonry/Feed'
import styles from './page.module.css'

/**
 * Subhome de tools — scope="tools" (arquitectura §8.2: "en subhomes, el
 * 100% de los contenidos del scope forma el universo"). Coexiste sin
 * conflicto con tools/[slug]/page.tsx (el detalle).
 */
export default function ToolsPage() {
  return (
    <div className={styles.page}>
      <AuxNav />
      <Feed scope="tools" />
    </div>
  )
}
