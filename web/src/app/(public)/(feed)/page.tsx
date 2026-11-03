import { Feed } from '@/components/masonry/Feed'
import { JsonLd } from '@/components/seo/JsonLd'
import { env } from '@/lib/env'
import { buildPageMetadata } from '@/lib/pageMetadata'
import { homeJsonLd } from '@/lib/structuredData'

const DESCRIPTION =
  'Cases, podcast episodes, insights and tools from Greener, a Barcelona-based brand strategy and insights agency.'

export const metadata = buildPageMetadata({
  title: 'Greener — brand strategy and insights agency',
  description: DESCRIPTION,
  path: '/',
  absoluteTitle: true,
})

export default function Home() {
  return (
    <>
      {/* Organization + WebSite: solo en la home (la entidad se declara una
          vez, no en cada página). */}
      <JsonLd data={homeJsonLd(env.NEXT_PUBLIC_SITE_URL, DESCRIPTION)} />
      <Feed scope="home" />
    </>
  )
}
