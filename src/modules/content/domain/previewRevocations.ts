/**
 * Revocación de enlaces de preview (SEC-ADM-D2). El token de preview es sin
 * estado; lo único que se guarda es, por contenido, desde cuándo se rechazan
 * los enlaces ya emitidos (`content.preview_revoked_at`).
 */

/** Lectura, con el cliente privilegiado, al validar un enlace. */
export interface PreviewRevocationReader {
  /**
   * Instante (ms) hasta el que los enlaces de ese contenido están revocados;
   * null si nunca se han revocado o el contenido no existe.
   */
  revokedAt(contentId: string): Promise<number | null>
}

/** Escritura, con la sesión del admin (la función SQL comprueba `is_admin()`). */
export interface PreviewRevoker {
  /** false si el contenido no existe. */
  revoke(contentId: string, revokedAt: number): Promise<boolean>
}

/**
 * Un enlace vale si no hay revocación o se emitió DESPUÉS de ella. En empate
 * (misma milésima) se rechaza: ante la duda, el lado seguro.
 */
export function isPreviewLinkRevoked(
  issuedAt: number,
  revokedAt: number | null,
): boolean {
  return revokedAt !== null && issuedAt <= revokedAt
}
