import { AuxNav } from '@/components/nav/AuxNav'
import { Feed } from '@/components/masonry/Feed'
import styles from './page.module.css'

/**
 * Subhome de episodios ("Podcasts" en el AuxNav) — scope="channel"
 * (arquitectura §8.2, §13: "en subhomes, el 100% de los contenidos del
 * scope forma el universo"). Los episodios abren en /work/[slug] (tipo B
 * unificado con caso) al hacer clic, igual que desde la home.
 */
export default function ChannelPage() {
  return (
    <div className={styles.page}>
      <AuxNav />
      <Feed scope="channel" />
    </div>
  )
}
