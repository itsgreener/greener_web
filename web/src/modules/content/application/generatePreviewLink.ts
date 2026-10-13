import type { ContentRepository } from '@/modules/content/domain/contentRepository'
import { publicContentPath } from '@/modules/content/domain/contentPath'

/**
 * Link de preview (arquitectura §15.3) de un contenido. El ABM lo muestra
 * para que Greener lo copie y lo comparta a mano; no se envía por ningún
 * canal. Devuelve null si el contenido no existe.
 */
export function makeGeneratePreviewLink({
  contents,
  encodePreviewToken,
  siteUrl,
}: {
  contents: Pick<ContentRepository, 'getById'>
  encodePreviewToken: (contentId: string) => string
  siteUrl: string
}) {
  return async function generatePreviewLink(
    contentId: string,
  ): Promise<string | null> {
    const content = await contents.getById(contentId)

    if (!content) return null

    const token = encodePreviewToken(content.id)
    const path = publicContentPath(content.type, content.slug)

    return `${siteUrl}${path}?preview=${token}`
  }
}
