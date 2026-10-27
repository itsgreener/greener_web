import { AdminButton } from '@/components/admin/AdminButton'
import { CloudinaryImage } from '@/components/media/CloudinaryImage'
import { ADMIN_THUMBNAIL_WIDTH } from '@/modules/media/domain/mediaDelivery'

import styles from './AdminMediaItem.module.css'

/** Rejilla de miniaturas (carrusel de un caso, medio de un pin). */
export function AdminMediaGrid({ children }: { children: React.ReactNode }) {
  return <div className={styles.grid}>{children}</div>
}

type Props = {
  /** Miniatura de una imagen; sin ella se enseña el identificador del vídeo. */
  image?: { publicId: string; alt: string }
  /** Identificador del medio, cuando es un vídeo y no hay miniatura. */
  videoId?: string
  /** Texto bajo la miniatura (el alt del medio). */
  caption?: string
  disabled?: boolean
  onRemove: () => void
}

/** Un medio ya subido, con su botón de quitar. */
export function AdminMediaItem({
  image,
  videoId,
  caption,
  disabled,
  onRemove,
}: Props) {
  return (
    <div className={styles.item}>
      {image ? (
        <CloudinaryImage
          className={styles.thumb}
          publicId={image.publicId}
          kind="image"
          profile="feed"
          srcWidth={ADMIN_THUMBNAIL_WIDTH}
          responsive={false}
          alt={image.alt}
          width={100}
          height={100}
        />
      ) : (
        <p className={styles.file}>{videoId} (vídeo)</p>
      )}

      {caption && <p className={styles.caption}>{caption}</p>}

      <AdminButton type="button" compact disabled={disabled} onClick={onRemove}>
        Quitar
      </AdminButton>
    </div>
  )
}
