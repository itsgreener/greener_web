import { deriveRng, randomInt, shuffled } from './prng'

/**
 * Calendario de interludios del feed (plan de `other`, §4): los contenidos
 * `other` (pin de newsletter, página satélite) no entran en la cuota de la
 * ronda; se insertan al servir cada lote, en posiciones que salen de la seed
 * de la sesión y de la frecuencia propia de cada contenido.
 *
 * Módulo puro y SIN ESTADO: el calendario se recalcula desde cero en cada
 * petición. Servir en lotes de 20 o de 40 da el mismo resultado porque el
 * plan calculado hasta el pin X es siempre prefijo exacto del calculado hasta
 * cualquier Y > X (las posiciones de lo que ya salió no dependen de lo que
 * venga después).
 *
 * Las posiciones se cuentan en PINES DE RONDA servidos en la sesión (sin
 * contar los propios interludios), empezando en 1; un interludio «en la
 * posición x» se inserta justo después del pin x.
 */
export const INTERLUDE_RULES = {
  /** Primera aparición del primer contenido del orden barajado. */
  firstMin: 10,
  firstMax: 30,
  /** Cada contenido siguiente: inicio del anterior + este rango. */
  stepMin: 8,
  stepMax: 15,
  /** Pines de ronda entre dos interludios consecutivos, como mínimo. */
  minGap: 5,
  /** Una REPETICIÓN que se retrasaría más que esto se omite. */
  maxRepeatDelay: 20,
  /** Frecuencia mínima por contenido (también `check` en la base de datos). */
  minFrequency: 25,
} as const

export interface InterludeSource {
  contentId: string
  /** «Una aparición cada N pines». */
  frequency: number
}

export interface InterludeSlot {
  /** Se inserta justo después del pin de ronda número `position` (desde 1). */
  position: number
  contentId: string
  /**
   * Número de aparición nominal del contenido (0 = la primera). Estable
   * aunque se omitan repeticiones, así que sirve para componer ids únicos y
   * para rotar entre los pines de una página.
   */
  occurrence: number
}

interface Appearance {
  nominal: number
  orderIndex: number
  contentId: string
  occurrence: number
}

/**
 * Posición inicial (nominal) de cada contenido, en el orden barajado de la
 * sesión: el primero entre `firstMin` y `firstMax`; cada siguiente, la
 * inicial del anterior más un entero entre `stepMin` y `stepMax`. Antes de
 * cualquier desplazamiento por coincidencia.
 */
export function interludeStartPositions(
  seed: string,
  sources: readonly InterludeSource[],
): { source: InterludeSource; start: number }[] {
  // El orden de entrada puede variar (la base de datos no lo garantiza):
  // se ordena por id antes de barajar para que la seed decida sola.
  const canonical = [...sources].sort((a, b) =>
    a.contentId < b.contentId ? -1 : a.contentId > b.contentId ? 1 : 0,
  )
  const order = shuffled(canonical, deriveRng(seed, 'interludes', 'order'))
  const rules = INTERLUDE_RULES

  let previousStart = 0

  return order.map((source, index) => {
    const start =
      index === 0
        ? rules.firstMin +
          randomInt(
            deriveRng(seed, 'interludes', 'first', source.contentId),
            rules.firstMax - rules.firstMin + 1,
          )
        : previousStart +
          rules.stepMin +
          randomInt(
            deriveRng(seed, 'interludes', 'step', source.contentId),
            rules.stepMax - rules.stepMin + 1,
          )

    previousStart = start

    return { source, start }
  })
}

/**
 * Apariciones de todos los contenidos hasta el pin de ronda `upTo`
 * (inclusive), ya resueltas: separación mínima y tope de retraso. Ordenadas
 * por posición, que es estrictamente creciente.
 *
 * 1. Cada contenido cae en `inicio + k·N` (calendario NOMINAL, que nunca se
 *    corre: un retraso por coincidencia no desplaza las apariciones
 *    siguientes del mismo contenido).
 * 2. Todas las apariciones se ordenan por posición nominal (a igual
 *    posición, por el orden barajado) y se recorren una vez: cada una cae en
 *    `max(nominal, anterior resuelta + minGap)`.
 * 3. Una repetición que acabaría más de `maxRepeatDelay` pines después de su
 *    posición nominal se omite y no empuja a las siguientes. La primera
 *    aparición nunca se omite, solo se retrasa.
 */
export function planInterludes(
  seed: string,
  sources: readonly InterludeSource[],
  upTo: number,
): InterludeSlot[] {
  if (sources.length === 0 || upTo < 1) return []

  const rules = INTERLUDE_RULES
  const appearances: Appearance[] = []

  interludeStartPositions(seed, sources).forEach(
    ({ source, start }, orderIndex) => {
      // Defensivo: la base de datos ya exige >= 25; un valor roto no puede
      // generar un bucle infinito ni una cadencia absurda.
      const frequency = Math.max(
        rules.minFrequency,
        Math.floor(Number.isFinite(source.frequency) ? source.frequency : 0),
      )

      for (
        let occurrence = 0, nominal = start;
        nominal <= upTo;
        occurrence++, nominal += frequency
      ) {
        appearances.push({
          nominal,
          orderIndex,
          contentId: source.contentId,
          occurrence,
        })
      }
    },
  )

  appearances.sort(
    (a, b) => a.nominal - b.nominal || a.orderIndex - b.orderIndex,
  )

  const slots: InterludeSlot[] = []
  let last = Number.NEGATIVE_INFINITY

  for (const appearance of appearances) {
    const position = Math.max(appearance.nominal, last + rules.minGap)

    if (
      appearance.occurrence > 0 &&
      position - appearance.nominal > rules.maxRepeatDelay
    ) {
      continue
    }

    last = position

    if (position <= upTo) {
      slots.push({
        position,
        contentId: appearance.contentId,
        occurrence: appearance.occurrence,
      })
    }
  }

  return slots
}

/** Apariciones que caen en los pines de ronda `from + 1 … to` (ambos incluidos al final). */
export function interludesInRange(
  seed: string,
  sources: readonly InterludeSource[],
  from: number,
  to: number,
): InterludeSlot[] {
  return planInterludes(seed, sources, to).filter(
    (slot) => slot.position > from,
  )
}

/**
 * Qué pin de una página satélite toca en cada aparición: arranca en uno
 * distinto por sesión y rota en cada aparición, para que una página con
 * varios pines los enseñe todos.
 */
export function pagePinIndex(
  seed: string,
  contentId: string,
  occurrence: number,
  pinCount: number,
): number {
  if (pinCount <= 0) return 0

  const offset = randomInt(
    deriveRng(seed, 'interludes', 'pin', contentId),
    pinCount,
  )

  return (offset + occurrence) % pinCount
}

/** Id del elemento de una aparición de newsletter: único por aparición. */
export function newsletterItemId(contentId: string, occurrence: number) {
  return `newsletter:${contentId}:${occurrence}`
}
