/**
 * Query de un listado del ABM (sin `?`): `clave=valor` por cada filtro con
 * valor y `page` solo a partir de la segunda página. Los filtros salen en el
 * orden en que se pasan. Sin filtros ni página, cadena vacía.
 */
export function buildListQuery(
  filters: Record<string, string | undefined>,
  page: number,
): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }

  if (page > 1) params.set('page', String(page))

  return params.toString()
}

/**
 * Enlace a una página de un listado del ABM con sus filtros en la URL (ver
 * `buildListQuery`). Sin filtros ni página, devuelve `basePath` tal cual.
 */
export function buildListHref(
  basePath: string,
  filters: Record<string, string | undefined>,
  page: number,
): string {
  const query = buildListQuery(filters, page)

  return query ? `${basePath}?${query}` : basePath
}
