import type { PreviewRevoker } from '@/modules/content/domain/previewRevocations'

/**
 * Invalida los enlaces de preview ya emitidos de un contenido. Los que se
 * generen después funcionan con normalidad. Devuelve false si el contenido no
 * existe.
 */
export function makeRevokePreviewLinks({
  revoker,
  now = Date.now,
}: {
  revoker: PreviewRevoker
  /** Inyectable para tests. */
  now?: () => number
}) {
  return async function revokePreviewLinks(
    contentId: string,
  ): Promise<boolean> {
    return revoker.revoke(contentId, now())
  }
}
