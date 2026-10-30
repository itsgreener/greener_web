import { Feed } from '@/components/masonry/Feed'
import { SECTION_LABELS } from '@/components/nav/sectionLabels'
import { buildPageMetadata } from '@/lib/pageMetadata'

export const metadata = buildPageMetadata({
  title: SECTION_LABELS.tools,
  description: 'Interactive tools by Greener for brands and marketing teams.',
})

/**
 * Subhome de tools — scope="tools" (arquitectura §8.2: "en subhomes, el
 * 100% de los contenidos del scope forma el universo"). Coexiste sin
 * conflicto con tools/[slug]/page.tsx (el detalle).
 */
export default function ToolsPage() {
  return <Feed scope="tools" />
}
