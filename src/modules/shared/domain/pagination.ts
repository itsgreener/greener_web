/**
 * Paginación de los listados del ABM (contenidos, talento, auditoría): el
 * número de página que llega en la URL y cuántas páginas hay.
 */

/** Página pedida en `?page=`: un entero desde 1; cualquier otra cosa, la 1. */
export function parsePage(raw: string | undefined): number {
  const page = Number.parseInt(raw ?? '', 10)

  return Number.isInteger(page) && page >= 1 ? page : 1
}

/** Páginas que hacen falta para `total` filas; como mínimo 1 (listado vacío). */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}
