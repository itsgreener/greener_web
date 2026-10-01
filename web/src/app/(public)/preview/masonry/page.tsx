import { notFound } from 'next/navigation'
import { MasonryFeed } from '@/components/masonry/MasonryFeed'
import styles from './page.module.css'

export const metadata = {
  title: 'Prototipo — Masonry',
}

// Bloqueado en producción (29 sep, PROGRESO §4.8): consume /api/feed/demo,
// que sirve un dataset de prueba sin relación con el contenido real — no
// debía ser una URL pública del sitio. Sigue disponible en desarrollo.
export default function MasonryPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

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
