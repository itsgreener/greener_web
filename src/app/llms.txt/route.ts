import { env } from '@/lib/env'
import { buildLlmsTxt } from '@/modules/content/domain/llmsTxt'

// Dinámico a propósito, igual que el sitemap y robots.txt: la URL sale de
// NEXT_PUBLIC_SITE_URL y no debe congelarse con el valor del build.
export const dynamic = 'force-dynamic'

export function GET() {
  return new Response(buildLlmsTxt(env.NEXT_PUBLIC_SITE_URL), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  })
}
