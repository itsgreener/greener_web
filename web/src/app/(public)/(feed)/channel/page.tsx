import { Feed } from '@/components/masonry/Feed'
import { SECTION_LABELS } from '@/components/nav/sectionLabels'
import { buildPageMetadata } from '@/lib/pageMetadata'

export const metadata = buildPageMetadata({
  title: SECTION_LABELS.channel,
  description:
    "Episodes of Greener's podcast programs: Brand the Future, Brand into Europe and Brand Founders & Leaders.",
})

/**
 * Subhome de episodios ("Podcasts" en el AuxNav) — scope="channel"
 * (arquitectura §8.2, §13: "en subhomes, el 100% de los contenidos del
 * scope forma el universo"). Los episodios abren en /work/[slug] (tipo B
 * unificado con caso) al hacer clic, igual que desde la home.
 */
export default function ChannelPage() {
  return <Feed scope="channel" />
}
