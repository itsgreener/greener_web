import type {
  CaseInput,
  ContentPinQueue,
  GeneratedPin,
  FeedContentKind,
} from './types'
import { deriveRng, hashToSeed, shuffled } from './prng'

interface RotatedPin {
  pinId: string
  relaxationLevel: 0 | 4
}

/**
 * Selecciona `force` pines de la cola de un caso para esta tanda, rotando
 * sin repetir hasta agotar la cola (brief §4.3). El offset combina la seed
 * de sesión (punto de partida distinto por sesión) con la ronda (avance
 * determinista `force * roundIndex` posiciones cada tanda).
 *
 * Si `force` supera el número de pines disponibles, el caso repite pines
 * dentro de la misma tanda (brief §4.3) — esas repeticiones se marcan con
 * relaxationLevel 4 para que queden reflejadas en el informe (§8.6).
 */
export function rotateCasePins(
  seed: string,
  roundIndex: number,
  input: CaseInput,
): RotatedPin[] {
  const { pinIds, force, contentId } = input
  if (pinIds.length === 0) return []

  const startSeed = hashToSeed(seed, contentId) % pinIds.length
  const offset = (startSeed + force * roundIndex) % pinIds.length

  const selected: RotatedPin[] = []
  for (let i = 0; i < force; i++) {
    selected.push({
      pinId: pinIds[(offset + i) % pinIds.length],
      relaxationLevel: i >= pinIds.length ? 4 : 0,
    })
  }
  return selected
}

function byContentId<T extends { contentId: string }>(a: T, b: T): number {
  return a.contentId < b.contentId ? -1 : a.contentId > b.contentId ? 1 : 0
}

/**
 * Orden de los contenidos de una vuelta (`pass`) del ciclo de un tipo. Cada
 * vuelta es una permutación distinta, derivada de la seed de sesión, del tipo
 * y del número de vuelta. Se parte siempre del orden canónico por `contentId`
 * porque el orden en que llega el catálogo no es estable.
 *
 * Si el contenido con el que empieza una vuelta es el mismo con el que acabó
 * la anterior (repetiría seguido al cambiar de vuelta), se intercambia con el
 * siguiente.
 */
function passOrders(
  seed: string,
  kind: FeedContentKind,
  contents: ContentPinQueue[],
  lastPass: number,
): ContentPinQueue[][] {
  const orders: ContentPinQueue[][] = []
  for (let pass = 0; pass <= lastPass; pass++) {
    const order = shuffled(contents, deriveRng(seed, 'cycle', kind, pass))
    const previous = orders[pass - 1]
    if (
      previous &&
      order.length > 1 &&
      order[0].contentId === previous[previous.length - 1].contentId
    ) {
      ;[order[0], order[1]] = [order[1], order[0]]
    }
    orders.push(order)
  }
  return orders
}

/**
 * Rellena la cuota de pines de un tipo de contenido (insights, tools,
 * channel, other) recorriendo sus contenidos como un ciclo infinito y sin
 * estado (arquitectura §8.2).
 *
 * El ciclo es una sucesión de «vueltas»: en cada una aparece UNA vez cada
 * contenido del tipo, en un orden aleatorio propio de la sesión. La ronda
 * `roundIndex` ocupa los huecos `[roundIndex·quota, (roundIndex+1)·quota)`
 * del ciclo, de modo que:
 *
 * - dentro de una sesión, ningún contenido se repite hasta haber salido todos
 *   los demás de su tipo (aunque el tipo solo aporte 3 pines por ronda);
 * - el orden cambia de una sesión a otra y de una vuelta a la siguiente;
 * - el pin elegido de cada contenido avanza un puesto por vuelta, así que
 *   tampoco se repite pin hasta agotar los del contenido.
 *
 * No hay estado entre rondas: el hueco de cada pin se calcula solo con la
 * seed y el índice de ronda, como el resto del motor. Si la cuota supera el
 * número de contenidos (5 insights para 32 posiciones, arquitectura §22) la
 * ronda cruza vueltas y repite contenido; esos pines llevan relaxationLevel 4
 * para que lo recoja el informe (§8.6).
 */
export function circularFillPool(
  seed: string,
  roundIndex: number,
  kind: FeedContentKind,
  pool: ContentPinQueue[],
  quota: number,
): GeneratedPin[] {
  const contents = pool
    .filter((content) => content.pinIds.length > 0)
    .sort(byContentId)
  const count = contents.length
  if (count === 0 || quota <= 0) return []

  const firstSlot = roundIndex * quota
  const lastPass = Math.floor((firstSlot + quota - 1) / count)
  const orders = passOrders(seed, kind, contents, lastPass)

  const result: GeneratedPin[] = []
  const seenContents = new Set<string>()

  for (let i = 0; i < quota; i++) {
    const slot = firstSlot + i
    const pass = Math.floor(slot / count)
    const content = orders[pass][slot % count]

    const start = hashToSeed(seed, content.contentId) % content.pinIds.length
    const pinId = content.pinIds[(start + pass) % content.pinIds.length]

    result.push({
      pinId,
      contentId: content.contentId,
      kind,
      relaxationLevel: seenContents.has(content.contentId) ? 4 : 0,
    })
    seenContents.add(content.contentId)
  }

  return result
}
