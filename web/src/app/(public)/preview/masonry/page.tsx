import { MasonryFeed } from '@/components/masonry/MasonryFeed'
import styles from './page.module.css'

export const metadata = {
  title: 'Prototipo — Masonry',
}

export default function MasonryPreviewPage() {
  return (
    <div className={styles.page}>
      <p className={styles.note}>
        Prototipo de Fase 1 (Anexo E.1) — motor de feed real + dataset de
        demostración (50 casos, 9 episodios). No es la Home final.
      </p>
      <MasonryFeed />
    </div>
  )
}
