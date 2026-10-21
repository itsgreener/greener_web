/**
 * Virtualización por lotes (arquitectura §10.2): cada batch es un bloque de
 * layout. Se mantienen montados los lotes que tocan la zona cercana al
 * viewport; el resto se sustituye por espaciadores del tamaño de cada pin,
 * que conservan la altura total sin mantener imágenes en el DOM.
 *
 * Los lotes se deciden por su posición REAL en la retícula, no sumando
 * alturas. Un lote empieza en las columnas más cortas, antes de que termine
 * el anterior, así que los lotes se solapan en vertical; sumar sus alturas
 * se pasa de la altura real en cada lote (unos 280-380 px por lote en
 * escritorio con 40 pines) y el «lote visible» iba quedando por detrás del
 * real. Hacia el lote 12 el desfase superaba el radio de montaje y los pines
 * que estaban en pantalla se sustituían por espaciadores vacíos.
 */

/** Franja vertical (en px, relativa al contenedor) que ocupa un lote. */
export interface BatchBounds {
  batchIndex: number
  top: number
  bottom: number
}

/** Lotes montados: de `first` a `last`, ambos incluidos. */
export interface MountedRange {
  first: number
  last: number
}

/** Un pin ya colocado: posición del medio y alto estimado de su rótulo. */
export interface PlacedCard {
  y: number
  height: number
  labelHeight: number
}

/**
 * Franja que ocupa cada lote, de su pin más alto al borde inferior del más
 * bajo (rótulo incluido). Un lote vacío (por ejemplo, tras retirar la
 * newsletter) no ocupa nada y no aparece.
 */
export function computeBatchBounds(
  cards: PlacedCard[],
  batchSizes: number[],
): BatchBounds[] {
  const bounds: BatchBounds[] = []
  let start = 0

  for (let batchIndex = 0; batchIndex < batchSizes.length; batchIndex++) {
    const slice = cards.slice(start, start + batchSizes[batchIndex])
    start += batchSizes[batchIndex]
    if (slice.length === 0) continue

    let top = Infinity
    let bottom = -Infinity
    for (const card of slice) {
      if (card.y < top) top = card.y
      const cardBottom = card.y + card.height + card.labelHeight
      if (cardBottom > bottom) bottom = cardBottom
    }

    bounds.push({ batchIndex, top, bottom })
  }

  return bounds
}

/**
 * Lotes que hay que montar para el viewport `[viewportTop, viewportBottom]`
 * (relativo al contenedor) con `margin` px de colchón por arriba y por abajo.
 *
 * Devuelve un rango continuo: un lote intermedio que no cruzara la zona se
 * monta igualmente, porque los lotes son contiguos en el orden del feed y un
 * hueco en medio de pines montados solo causaría parpadeos. Si ningún lote
 * cruza (el viewport está fuera de la retícula, por ejemplo al restaurar un
 * scroll antes de tener altura), se monta el más cercano.
 */
export function computeMountedRange(
  bounds: BatchBounds[],
  viewportTop: number,
  viewportBottom: number,
  margin: number,
): MountedRange {
  if (bounds.length === 0) return { first: 0, last: -1 }

  const from = viewportTop - margin
  const to = viewportBottom + margin

  let first = Infinity
  let last = -Infinity
  for (const b of bounds) {
    if (b.bottom > from && b.top < to) {
      if (b.batchIndex < first) first = b.batchIndex
      if (b.batchIndex > last) last = b.batchIndex
    }
  }

  if (first !== Infinity) return { first, last }

  const centre = (viewportTop + viewportBottom) / 2
  let nearest = bounds[0]
  let nearestDistance = Infinity
  for (const b of bounds) {
    const distance = Math.min(
      Math.abs(b.top - centre),
      Math.abs(b.bottom - centre),
    )
    if (distance < nearestDistance) {
      nearest = b
      nearestDistance = distance
    }
  }

  return { first: nearest.batchIndex, last: nearest.batchIndex }
}
