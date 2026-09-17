import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublicCaseDetail } from '@/modules/content/application/getPublicCaseDetail'
import { getPublicCaseCarousel } from '@/modules/content/application/getPublicCaseCarousel'
import { getPublicEpisode } from '@/modules/content/application/getPublicEpisode'
import { CaseDetail } from './CaseDetail'
import { EpisodeDetail } from './EpisodeDetail'
import { getWorkContent, buildWorkMetadata } from './workContent'
import styles from './page.module.css'

type Props = {
  params: Promise<{ slug: string }>
}

/**
 * Detalle tipo B (especificacion-final-formato-detalle.md §1, §7): caso y
 * episodio comparten ruta /work/[slug] — antes el episodio vivía en
 * /channel/[slug], arquitectura previa a este rediseño. Ruta canónica —
 * siempre renderiza default_locale. Las variantes de idioma de un caso
 * viven en ./[locale]/page.tsx (§7.7); un episodio no las tiene nunca.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const content = await getWorkContent(slug)
  if (!content) return {}
  return buildWorkMetadata(content)
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
