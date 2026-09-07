/**
 * Virtualización por lotes (arquitectura §10.2): cada batch es un bloque de
 * layout con altura conocida. Se mantienen montados el visible y dos
 * anteriores/posteriores; el resto se sustituye por espaciadores que
 * conservan la altura total, para no perder la posición de scroll.
 */

export interface BatchHeight {
  batchIndex: number
  height: number
}

export interface VirtualizationResult {
  mountedBatchIndexes: Set<number>
  /** Alto acumulado antes del primer batch montado — hueco superior. */
  topSpacerHeight: number
  /** Alto acumulado después del último batch montado — hueco inferior. */
  bottomSpacerHeight: number
}

const MOUNT_RADIUS = 2

export function computeVirtualization(
  batchHeights: BatchHeight[],
  visibleBatchIndex: number,
): VirtualizationResult {
  const mountedBatchIndexes = new Set<number>()
  for (
    let i = visibleBatchIndex - MOUNT_RADIUS;
    i <= visibleBatchIndex + MOUNT_RADIUS;
    i++
  ) {
    if (i >= 0 && i < batchHeights.length) mountedBatchIndexes.add(i)
  }

  let topSpacerHeight = 0
  let bottomSpacerHeight = 0
  for (const { batchIndex, height } of batchHeights) {
    if (mountedBatchIndexes.has(batchIndex)) continue
    if (batchIndex < visibleBatchIndex) topSpacerHeight += height
    else bottomSpacerHeight += height
  }

  return { mountedBatchIndexes, topSpacerHeight, bottomSpacerHeight }
}
