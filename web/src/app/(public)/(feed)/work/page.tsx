import { Feed } from '@/components/masonry/Feed'
import { SECTION_LABELS } from '@/components/nav/sectionLabels'
import { buildPageMetadata } from '@/lib/pageMetadata'

export const metadata = buildPageMetadata({
  title: SECTION_LABELS.work,
  description:
    'Brand and campaign cases by Greener, a Barcelona-based brand strategy and insights agency.',
})

/**
 * Subhome de casos ("We did it" en el AuxNav) — scope="work"
 * (arquitectura §8.2: "en subhomes, el 100% de los contenidos del scope
 * forma el universo"). Mismo patrón que la home (AuxNav + Feed), solo
 * cambia el scope de la feedSession.
 */
export default function WorkPage() {
  return <Feed scope="work" />
}
