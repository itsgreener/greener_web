import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getPublicCaseDetail } from '@/modules/content/application/getPublicCaseDetail'
import { getPublicCaseCarousel } from '@/modules/content/application/getPublicCaseCarousel'
import { localeSchema } from '@/modules/content/domain/contentSchema'
import { CaseDetail } from '../CaseDetail'
import { getWorkContent, buildWorkMetadata } from '../workContent'
import styles from '../page.module.css'

type Props = {
  params: Promise<{ slug: string; locale: string }>
}

/**
 * Variante de idioma de un caso (arquitectura §7.7: "Casos: URL canónica
 * /work/{slug}; idiomas alternativos en /work/{slug}/{locale}"). Solo
 * caso — un episodio "no se traduce" (§7.4, un único idioma) y no tiene
 * ninguna URL válida aquí, siempre 404.
 *
 * Si el locale pedido coincide con el default_locale del contenido,
 * redirige a la ruta canónica sin segmento de idioma — evita servir el
 * mismo contenido bajo dos URLs distintas (duplicate content en SEO).
 */
async function resolveCaseContent(slug: string, localeParam: string) {
  const parsedLocale = localeSchema.safeParse(localeParam)
  if (!parsedLocale.success) return null

  const content = await getWorkContent(slug, parsedLocale.data)
  if (!content || content.type !== 'case') return null

  return content
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params
  const content = await resolveCaseContent(slug, locale)
  if (!content) return {}
  return buildWorkMetadata(content)
}

export default async function WorkLocalePage({ params }: Props) {
  const { slug, locale } = await params
  const content = await resolveCaseContent(slug, locale)

  if (!content) {
    notFound()
  }

  if (content.locale === content.defaultLocale) {
    redirect(`/work/${slug}`)
  }

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
