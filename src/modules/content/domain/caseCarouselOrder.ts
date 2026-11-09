/**
 * Orden de las diapositivas del carrusel de un caso.
 *
 * `case_detail_media.sort_order` no es único y quitar una diapositiva no
 * renumera las demás, así que el número de diapositivas NO sirve de orden
 * para la siguiente: con órdenes 0, 1, 2 y la 0 quitada, «número de
 * diapositivas» da 2 y empata con la que ya existe. El siguiente orden libre
 * es siempre el mayor existente más uno.
 */
export function nextCarouselSortOrder(
  items: ReadonlyArray<{ sortOrder: number }>,
): number {
  return items.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1
}

// Idioma fijo, no el del navegador: el orden de un lote no puede depender de
// qué ordenador lo prepara. `numeric` pone `slide-2` antes que `slide-10`;
// `base` ignora mayúsculas y tildes al comparar.
const NATURAL_NAME_ORDER = new Intl.Collator('es', {
  numeric: true,
  sensitivity: 'base',
})

/**
 * Ordena por nombre de archivo en orden natural. Es el orden en que se
 * añaden las diapositivas de un lote: determinista y visible en la tabla
 * antes de subir. No modifica el original.
 */
export function sortByNaturalName<Item extends { name: string }>(
  items: readonly Item[],
): Item[] {
  return [...items].sort((a, b) => NATURAL_NAME_ORDER.compare(a.name, b.name))
}

/**
 * Mueve el elemento de la posición `from` a la posición `to` (índices desde
 * 0; `to` se acota al rango, así que «posición 99» es «al final»). Devuelve
 * una lista nueva; si `from` no existe o no hay movimiento, una copia igual.
 */
export function moveCarouselItem<Item>(
  items: readonly Item[],
  from: number,
  to: number,
): Item[] {
  const next = [...items]

  if (!Number.isInteger(from) || from < 0 || from >= next.length) return next

  const target = Math.min(
    Math.max(Number.isInteger(to) ? to : from, 0),
    next.length - 1,
  )

  if (target === from) return next

  const [moved] = next.splice(from, 1)

  next.splice(target, 0, moved)

  return next
}

/** ¿Mismos ids en el mismo orden? */
export function isSameOrder(
  a: readonly string[],
  b: readonly string[],
): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

/**
 * Orden que se enseña mientras el admin reordena: el borrador, puesto al día
 * con las diapositivas que hay de verdad. Lo que ya no existe se descarta y
 * lo que ha aparecido (una subida, otra pestaña) va al final, en su orden
 * guardado. Sin borrador, es el orden guardado tal cual.
 */
export function reconcileOrder(
  draft: readonly string[] | null,
  saved: readonly string[],
): string[] {
  if (draft === null) return [...saved]

  const present = new Set(saved)
  const drafted = new Set(draft)

  return [
    ...draft.filter((id) => present.has(id)),
    ...saved.filter((id) => !drafted.has(id)),
  ]
}
