// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { PinCard, type PinCardData } from '@/components/pin/PinCard'
import { useMasonryPositions } from '@/components/masonry/useMasonryPositions'

/**
 * Regresión del 7 oct 2026: «Encountered two children with the same key»,
 * cientos de veces. El feed es infinito y recicla pines (colas circulares:
 * un insight sale varias veces por ronda, y con el catálogo agotado casi todo
 * se repite), y la key de cada tarjeta era el `pinId`, que por tanto no es
 * único en la lista. La key ahora es de POSICIÓN (`PositionedPin.key`).
 */

function pin(id: string): PinCardData {
  return {
    pinId: id,
    destination: `/work/${id}`,
    ratio: '1:1',
    label: id,
    cta: null,
    alt: id,
    autoplayMode: null,
    media: [{ kind: 'image', cloudinaryPublicId: 'sample' }],
  }
}

/** Dos lotes (rondas) con pines repetidos DENTRO de cada uno y ENTRE ambos. */
const BATCH_1 = ['a', 'b', 'c', 'a', 'b'].map(pin)
const BATCH_2 = ['c', 'a', 'd', 'd'].map(pin)

function Harness({
  items,
  batchSizes,
  keyOf,
}: {
  items: PinCardData[]
  batchSizes: number[]
  keyOf: 'slot' | 'pinId'
}) {
  const { containerRef, positioned } = useMasonryPositions(items, batchSizes)

  return (
    <div ref={containerRef}>
      {positioned.map((p) => (
        <PinCard
          key={keyOf === 'slot' ? p.key : p.item.pinId}
          instanceId={keyOf === 'slot' ? p.key : undefined}
          pin={p.item}
          style={{ x: p.x, y: p.y, width: p.width, height: p.height }}
        />
      ))}
    </div>
  )
}

function keyWarnings(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.filter((call: unknown[]) =>
    String(call[0]).includes('two children with the same key'),
  )
}

describe('masonry — keys únicas aunque el mismo pin se repita', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // En jsdom no hay layout: el ancho del contenedor lo da este stub.
    global.ResizeObserver = class {
      cb: ResizeObserverCallback
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb
      }
      observe() {
        this.cb(
          [{ contentRect: { width: 1000 } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        )
      }
      disconnect() {}
      unobserve() {}
    } as unknown as typeof ResizeObserver
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('con la key de posición no hay aviso de claves duplicadas y se pinta una tarjeta por ítem', () => {
    const items = [...BATCH_1, ...BATCH_2]
    const { container } = render(
      <Harness items={items} batchSizes={[5, 4]} keyOf="slot" />,
    )

    expect(container.querySelectorAll('a')).toHaveLength(items.length)
    expect(keyWarnings(errorSpy)).toHaveLength(0)
  })

  it('control: con el pinId como key (el código anterior) React avisa — el test detecta el bug', () => {
    render(
      <Harness
        items={[...BATCH_1, ...BATCH_2]}
        batchSizes={[5, 4]}
        keyOf="pinId"
      />,
    )

    expect(keyWarnings(errorSpy).length).toBeGreaterThan(0)
  })

  it('al añadir un lote al final, las tarjetas ya pintadas conservan su identidad (no se remontan)', () => {
    const { container, rerender } = render(
      <Harness items={BATCH_1} batchSizes={[5]} keyOf="slot" />,
    )
    const before = Array.from(container.querySelectorAll('a'))
    expect(before).toHaveLength(5)

    rerender(
      <Harness
        items={[...BATCH_1, ...BATCH_2]}
        batchSizes={[5, 4]}
        keyOf="slot"
      />,
    )
    const after = Array.from(container.querySelectorAll('a'))

    expect(after).toHaveLength(9)
    // Mismos nodos DOM: React reutilizó las tarjetas en vez de recrearlas.
    before.forEach((node, i) => expect(after[i]).toBe(node))
    expect(keyWarnings(errorSpy)).toHaveLength(0)
  })
})
