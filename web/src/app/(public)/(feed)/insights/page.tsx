import { Feed } from '@/components/masonry/Feed'

/**
 * Subhome de insights — scope="insights" (arquitectura §8.2: "en
 * subhomes, el 100% de los contenidos del scope forma el universo").
 * Coexiste sin conflicto con insights/[slug]/page.tsx (el detalle).
 */
export default function InsightsPage() {
  return <Feed scope="insights" />
}
