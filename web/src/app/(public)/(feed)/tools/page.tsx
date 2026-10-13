import { Feed } from '@/components/masonry/Feed'

/**
 * Subhome de tools — scope="tools" (arquitectura §8.2: "en subhomes, el
 * 100% de los contenidos del scope forma el universo"). Coexiste sin
 * conflicto con tools/[slug]/page.tsx (el detalle).
 */
export default function ToolsPage() {
  return <Feed scope="tools" />
}
