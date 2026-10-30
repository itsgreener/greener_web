import { Feed } from '@/components/masonry/Feed'
import { SECTION_LABELS } from '@/components/nav/sectionLabels'
import { buildPageMetadata } from '@/lib/pageMetadata'

export const metadata = buildPageMetadata({
  title: SECTION_LABELS.insights,
  description:
    'Research and insight pieces from Greener on branding, agro and sustainability.',
})

/**
 * Subhome de insights — scope="insights" (arquitectura §8.2: "en
 * subhomes, el 100% de los contenidos del scope forma el universo").
 * Coexiste sin conflicto con insights/[slug]/page.tsx (que solo redirige
 * al paquete, /insights/[slug]/app).
 */
export default function InsightsPage() {
  return <Feed scope="insights" />
}
