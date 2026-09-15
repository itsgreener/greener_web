import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getContentBySlug } from '@/modules/content/application/getContentBySlug'
import { getPublicCaseDetail } from '@/modules/content/application/getPublicCaseDetail'
import { getPublicCaseCarousel } from '@/modules/content/application/getPublicCaseCarousel'
import { getPublicEpisode } from '@/modules/content/application/getPublicEpisode'
import { buildImageUrl } from '@/modules/media/infrastructure/cloudinaryUrl'
import { CaseDetail } from './CaseDetail'
import { EpisodeDetail } from './EpisodeDetail'
import styles from './page.module.css'

type Props = {
  params: Promise<{ slug: string }>
}

/**
 * Detalle tipo B (especificacion-final-formato-detalle.md §1, §7): caso y
 * episodio comparten ruta /work/[slug] — antes el episodio vivía en
 * /channel/[slug], arquitectura previa a este rediseño. Sin variantes de
 * idioma (/work/{slug}/{locale}) en esta primera versión — a propósito,
 * ver PROGRESO.md.
 */
async function getWorkContent(slug: string) {
  const content = await getContentBySlug(slug)
  if (!content || (content.type !== 'case' && content.type !== 'episode')) {
    return null
  }
  return content
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const content = await getWorkContent(slug)
  if (!content) return {}

  const title = content.seoTitle ?? content.title
  const description = content.seoDescription ?? content.summary ?? undefined

  // og_media_id es cover_media_id, que caso/episodio no rellenan (§3: es
  // exclusivo de tool/insight/other) — para un caso se usa la primera
  // imagen de su carrusel; un episodio, sin thumbnail propio, se queda
  // sin imagen de compartición por ahora.
  let ogImage: string | undefined
  if (content.type === 'case') {
    const carousel = await getPublicCaseCarousel(content.id)
    const firstImage = carousel.find((item) => item.kind === 'image')
    if (firstImage) {
      ogImage = buildImageUrl(firstImage.cloudinaryPublicId, 'detail', 1200)
    }
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

export default async function WorkPage({ params }: Props) {
  const { slug } = await params
  const content = await getWorkContent(slug)

  if (!content) {
    notFound()
  }

  if (content.type === 'case') {
    const [caseDetail, carousel] = await Promise.all([
      getPublicCaseDetail(content.id),
      getPublicCaseCarousel(content.id),
    ])

    return (
      <div className={styles.page}>
        <CaseDetail
          content={content}
          caseDetail={caseDetail}
          carousel={carousel}
        />
      </div>
    )
  }

  const episode = await getPublicEpisode(content.id)

  // No debería pasar (todo content.type='episode' se crea junto a su fila
  // de episode), pero sin ella no hay nada que embeber — 404 defensivo
  // antes que una página rota.
  if (!episode) {
    notFound()
  }

  return (
    <div className={styles.page}>
      <EpisodeDetail content={content} episode={episode} />
    </div>
  )
}
