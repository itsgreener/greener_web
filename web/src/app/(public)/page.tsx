import { HomeFeed } from '@/components/masonry/HomeFeed'
import styles from './page.module.css'

export default function Home() {
  return (
    <div className={styles.page}>
      <HomeFeed />
    </div>
  )
}
