import { AuxNav } from '@/components/nav/AuxNav'
import { Feed } from '@/components/masonry/Feed'
import styles from './page.module.css'

/**
 * Subhome de casos ("We did it" en el AuxNav) — scope="work"
 * (arquitectura §8.2: "en subhomes, el 100% de los contenidos del scope
 * forma el universo"). Mismo patrón que la home (AuxNav + Feed), solo
 * cambia el scope de la feedSession.
 */
export default function WorkPage() {
  return (
    <div className={styles.page}>
      <AuxNav />
      <Feed scope="work" />
    </div>
  )
}
