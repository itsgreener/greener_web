import { describe, it, expect } from 'vitest'
import {
  DETAIL_VIDEO_L_THRESHOLD,
  DETAIL_VIDEO_RUNGS,
  FEED_VIDEO_WIDTH,
  IMAGE_DELIVERY,
  detailVideoRungM,
  pickDetailVideoRung,
  pickFeedImageWidth,
} from '@/modules/media/domain/mediaDelivery'
import type { PinRatioValue } from '@/modules/shared/domain/ratio'
import { RATIO_DECIMAL_VALUE } from '@/modules/shared/domain/ratio'
describe('escalones M y L de la ficha (contrato §4.3)', () => {
  it('tabla EXACTA del contrato, ratio a ratio (ancho×alto)', () => {
    const table: Record<PinRatioValue, [[number, number], [number, number]]> = {
      '16:9': [
        [1280, 720],
        [1600, 900],
      ],
      '4:3': [
        [1104, 828],
        [1380, 1036],
      ],
      '1:1': [
        [960, 960],
        [1200, 1200],
      ],
      '4:5': [
        [856, 1070],
        [1070, 1338],
      ],
      '3:4': [
        [828, 1104],
        [1036, 1380],
      ],
      '2:3': [
        [780, 1170],
        [976, 1464],
      ],
      '9:16': [
        [720, 1280],
        [900, 1600],
      ],
    }

    for (const [ratio, [m, l]] of Object.entries(table)) {
      const rungs = DETAIL_VIDEO_RUNGS[ratio as PinRatioValue]

      expect([rungs.M.width, rungs.M.height]).toEqual(m)
      expect([rungs.L.width, rungs.L.height]).toEqual(l)
    }
  })

  it('hay fila para los 7 ratios cerrados', () => {
    expect(Object.keys(DETAIL_VIDEO_RUNGS).sort()).toEqual(
      Object.keys(RATIO_DECIMAL_VALUE).sort(),
    )
  })

  it('M ≈ 0,92 MP y L ≈ 1,44 MP en todos los ratios: presupuesto de píxeles, no de ancho', () => {
    for (const rungs of Object.values(DETAIL_VIDEO_RUNGS)) {
      const mp = (r: { width: number; height: number }) =>
        (r.width * r.height) / 1e6

      expect(mp(rungs.M)).toBeGreaterThan(0.89)
      expect(mp(rungs.M)).toBeLessThan(0.93)
      expect(mp(rungs.L)).toBeGreaterThan(1.38)
      expect(mp(rungs.L)).toBeLessThan(1.45)
    }
  })

  it('cada escalón respeta el ratio de su fila (con la tolerancia del redondeo a píxel)', () => {
    for (const [ratio, rungs] of Object.entries(DETAIL_VIDEO_RUNGS)) {
      const target = RATIO_DECIMAL_VALUE[ratio as PinRatioValue]

      for (const r of [rungs.M, rungs.L]) {
        expect(Math.abs(r.width / r.height - target) / target).toBeLessThan(
          0.005,
        )
      }
    }
  })

  it('el umbral para pasar a L es 1,09 (1400/1280)', () => {
    expect(DETAIL_VIDEO_L_THRESHOLD).toBe(1.09)
  })

  /**
   * Cajas reales de la ficha del contrato §4.3 (px CSS, 16:9, 1:1, 9:16),
   * con el resultado que el contrato da para cada pantalla.
   */
  describe('selección por caja real y DPR', () => {
    const cases: Array<{
      screen: string
      ratio: PinRatioValue
      box: [number, number]
      dpr: number
      expected: 'M' | 'L'
    }> = [
      // 1366×768
      {
        screen: '1366×768',
        ratio: '16:9',
        box: [771, 434],
        dpr: 1,
        expected: 'M',
      },
      {
        screen: '1366×768',
        ratio: '1:1',
        box: [434, 434],
        dpr: 1,
        expected: 'M',
      },
      // MacBook 1440×900, DPR 2: la imagen pide ~1750 px, M se queda blando
      {
        screen: 'MacBook',
        ratio: '16:9',
        box: [878, 494],
        dpr: 2,
        expected: 'L',
      },
      {
        screen: 'MacBook',
        ratio: '1:1',
        box: [527, 527],
        dpr: 2,
        expected: 'L',
      },
      {
        screen: 'MacBook',
        ratio: '9:16',
        box: [296, 527],
        dpr: 2,
        expected: 'M',
      },
      // 1080p a 100 %: M cubre
      {
        screen: '1920×1080',
        ratio: '16:9',
        box: [1126, 634],
        dpr: 1,
        expected: 'M',
      },
      {
        screen: '1920×1080',
        ratio: '1:1',
        box: [634, 634],
        dpr: 1,
        expected: 'M',
      },
      // 1440p a 100 %: M se amplía un 20 %
      {
        screen: '2560×1440',
        ratio: '16:9',
        box: [1553, 874],
        dpr: 1,
        expected: 'L',
      },
      {
        screen: '2560×1440',
        ratio: '9:16',
        box: [491, 874],
        dpr: 1,
        expected: 'M',
      },
      // 4K a 100 %: sigue ampliándose (aceptado), pero con L
      {
        screen: '3840×2160',
        ratio: '16:9',
        box: [2372, 1334],
        dpr: 1,
        expected: 'L',
      },
      {
        screen: '3840×2160',
        ratio: '9:16',
        box: [750, 1334],
        dpr: 1,
        expected: 'M',
      },
    ]

    for (const c of cases) {
      it(`${c.screen}, ${c.ratio}, caja ${c.box.join('×')}, DPR ${c.dpr} → ${c.expected}`, () => {
        const picked = pickDetailVideoRung({
          ratio: c.ratio,
          boxWidthPx: c.box[0],
          boxHeightPx: c.box[1],
          devicePixelRatio: c.dpr,
        })

        expect(picked.rung).toBe(c.expected)
        expect({ w: picked.width, h: picked.height }).toEqual({
          w: DETAIL_VIDEO_RUNGS[c.ratio][c.expected].width,
          h: DETAIL_VIDEO_RUNGS[c.ratio][c.expected].height,
        })
      })
    }

    it('el DPR se limita a 2: un DPR 3 no cambia el escalón respecto a 2', () => {
      const args = {
        ratio: '16:9' as const,
        boxWidthPx: 700,
        boxHeightPx: 394,
      }

      expect(pickDetailVideoRung({ ...args, devicePixelRatio: 3 })).toEqual(
        pickDetailVideoRung({ ...args, devicePixelRatio: 2 }),
      )
    })

    it('el umbral es estricto: justo en 1,09 × lado mayor de M sigue siendo M', () => {
      // 16:9, lado mayor de M = 1280 → 1,09 × 1280 = 1395,2
      const at = pickDetailVideoRung({
        ratio: '16:9',
        boxWidthPx: 1395.2,
        boxHeightPx: 700,
        devicePixelRatio: 1,
      })
      const above = pickDetailVideoRung({
        ratio: '16:9',
        boxWidthPx: 1395.3,
        boxHeightPx: 700,
        devicePixelRatio: 1,
      })

      expect(at.rung).toBe('M')
      expect(above.rung).toBe('L')
    })

    it('sin caja medida (0) devuelve M, nunca L', () => {
      expect(
        pickDetailVideoRung({
          ratio: '16:9',
          boxWidthPx: 0,
          boxHeightPx: 0,
          devicePixelRatio: 2,
        }).rung,
      ).toBe('M')
    })

    it('un vídeo vertical NO se sirve con más píxeles que uno apaisado: ningún escalón supera ~1,45 MP', () => {
      for (const ratio of Object.keys(DETAIL_VIDEO_RUNGS) as PinRatioValue[]) {
        const huge = pickDetailVideoRung({
          ratio,
          boxWidthPx: 5000,
          boxHeightPx: 5000,
          devicePixelRatio: 2,
        })

        expect((huge.width * huge.height) / 1e6).toBeLessThan(1.45)
      }
    })
  })

  it('detailVideoRungM devuelve el escalón M de cada ratio', () => {
    expect(detailVideoRungM('4:5')).toEqual({ width: 856, height: 1070 })
  })
})

describe('imágenes del feed (contrato §4.2)', () => {
  it('escalera 320/480/640 (tope 640)', () => {
    expect([...IMAGE_DELIVERY.feed.widths]).toEqual([320, 480, 640])
  })

  it('el `src` de reserva es SIEMPRE un escalón, nunca el ancho exacto de la tarjeta', () => {
    for (let w = 100; w <= 800; w += 7) {
      expect(IMAGE_DELIVERY.feed.widths).toContain(
        pickFeedImageWidth(w) as never,
      )
    }
  })

  it('elige el menor escalón que cubre la tarjeta (con tope en 640)', () => {
    expect(pickFeedImageWidth(189)).toBe(320)
    expect(pickFeedImageWidth(320)).toBe(320)
    expect(pickFeedImageWidth(321)).toBe(480)
    expect(pickFeedImageWidth(330, 2)).toBe(640)
    expect(pickFeedImageWidth(5000)).toBe(640)
    expect(pickFeedImageWidth(0)).toBe(320)
  })
})

describe('vídeo del feed (contrato §4.4)', () => {
  it('un solo ancho para todos los ratios: 480', () => {
    expect(FEED_VIDEO_WIDTH).toBe(480)
  })
})
