import { AuxNav } from '@/components/nav/AuxNav'
import { Feed } from '@/components/masonry/Feed'
import styles from './page.module.css'

export default function Home() {
  return (
    <div className={styles.page}>
      <AuxNav />
      <Feed scope="home" />
    </div>
  )
}
