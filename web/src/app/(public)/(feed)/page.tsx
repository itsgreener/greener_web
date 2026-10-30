import { Feed } from '@/components/masonry/Feed'
import { buildPageMetadata } from '@/lib/pageMetadata'

export const metadata = buildPageMetadata({
  title: 'Greener — brand strategy and insights agency',
  description:
    'Cases, podcast episodes, insights and tools from Greener, a Barcelona-based brand strategy and insights agency.',
  absoluteTitle: true,
})

export default function Home() {
  return <Feed scope="home" />
}
