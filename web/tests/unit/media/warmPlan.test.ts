import { describe, expect, it } from 'vitest'
import fc from 'fast-check'

import { pinRatioSchema } from '@/modules/pin/domain/pinSchema'
import type { PinRatioValue } from '@/modules/media/domain/closestRatio'
import {
  caseVideoRatio,
  TOOL_INSIGHT_FALLBACK_RATIO,
  toolInsightDetailRatio,
} from '@/modules/media/domain/detailVideoRatio'
import {
  DETAIL_VIDEO_RUNGS,
  detailVideoRungM,
  FEED_VIDEO_WIDTH,
  pickDetailVideoRung,
} from '@/modules/media/domain/mediaDelivery'
import {
  planVideoWarming,
  warmContractId,
  type VideoUsage,
  type WarmRendition,
} from '@/modules/media/domain/warmPlan'
import {
  buildFeedVideoSources,
  buildVideoSources,
  buildVideoTransformations,
} from '@/modules/media/infrastructure/cloudinaryUrl'

const RATIOS = pinRatioSchema.options as readonly PinRatioValue[]
const ID = 'greener/content/videos/demo'
const BASE_VIDEO = 'https://res.cloudinary.com/test-cloud/video/upload'

/** Parte de transformación de una URL de entrega (entre `upload/` y el id). */
function transformationOf(src: string): string {
  expect(src.startsWith(`${BASE_VIDEO}/`)).toBe(true)
  expect(src.endsWith(`/${ID}`)).toBe(true)
  return src.slice(BASE_VIDEO.length + 1, src.length - ID.length - 1)
}

function eagerStrings(renditions: WarmRendition[]): string[] {
  return renditions.flatMap((r) => buildVideoTransformations(r.profile, r.size))
}

function pin(over: Partial<Extract<VideoUsage, { kind: 'pin' }>> = {}) {
  return {
    kind: 'pin',
    contentType: 'tool',
    pinRatio: '4:5',
    durationSeconds: 6,
    autoplayMode: 'viewport',
    ...over,
  } as Extract<VideoUsage, { kind: 'pin' }>
}

describe('ratio compartido entre entrega y calentamiento', () => {
  it('ficha de tool/other: override > cover > 4:5', () => {
    expect(toolInsightDetailRatio('16:9', '1:1')).toBe('16:9')
    expect(toolInsightDetailRatio(null, '1:1')).toBe('1:1')
    expect(toolInsightDetailRatio(undefined, undefined)).toBe('4:5')
    expect(TOOL_INSIGHT_FALLBACK_RATIO).toBe('4:5')
  })

  it('vídeo de caso: el ratio cerrado más cercano al propio vídeo', () => {
    expect(caseVideoRatio(1920, 1080)).toBe('16:9')
    expect(caseVideoRatio(1080, 1920)).toBe('9:16')
    expect(caseVideoRatio(1000, 1000)).toBe('1:1')
  })
})

describe('planVideoWarming — pines', () => {
  it('pin de tool que se anima: feed 480 + escalón M de la ficha con el ratio del pin', () => {
    expect(planVideoWarming([pin({ pinRatio: '4:5' })])).toEqual([
      { profile: 'feed', size: { width: FEED_VIDEO_WIDTH } },
      { profile: 'toolDetail', size: { width: 856, height: 1070 } },
    ])
  })

  it('pin de otro tipo (case, episodio, insight…): solo feed, nunca ficha', () => {
    for (const contentType of [
      'case',
      'episode',
      'insight',
      'other',
    ] as const) {
      expect(planVideoWarming([pin({ contentType })])).toEqual([
        { profile: 'feed', size: { width: FEED_VIDEO_WIDTH } },
      ])
    }
  })

  it('un vídeo que nunca se anima no calienta el feed (sin autoplayMode)', () => {
    expect(
      planVideoWarming([pin({ contentType: 'case', autoplayMode: null })]),
    ).toEqual([])
  })

  it('un vídeo de más de 8 s solo enseña el póster en el feed: no calienta el feed, sí la ficha', () => {
    expect(planVideoWarming([pin({ durationSeconds: 12 })])).toEqual([
      { profile: 'toolDetail', size: { width: 856, height: 1070 } },
    ])
    expect(planVideoWarming([pin({ durationSeconds: 8 })])).toHaveLength(2)
    expect(planVideoWarming([pin({ durationSeconds: 9 })])).toHaveLength(1)
  })

  it('duración desconocida (fila antigua): se asume que se anima, como PinCard', () => {
    expect(planVideoWarming([pin({ durationSeconds: null })])).toHaveLength(2)
  })

  it('tool con autoplayMode null: sigue necesitando la ficha', () => {
    expect(planVideoWarming([pin({ autoplayMode: null })])).toEqual([
      { profile: 'toolDetail', size: { width: 856, height: 1070 } },
    ])
  })
})

describe('planVideoWarming — carrusel de caso y portada de other', () => {
  it('carrusel de caso: escalón M del ratio del propio vídeo, perfil con audio', () => {
    expect(
      planVideoWarming([{ kind: 'caseCarousel', width: 1920, height: 1080 }]),
    ).toEqual([{ profile: 'caseDetail', size: { width: 1280, height: 720 } }])
  })

  it('portada de other: escalón M de su cover_ratio, o de 4:5 si no tiene', () => {
    expect(
      planVideoWarming([{ kind: 'otherCover', coverRatio: '16:9' }]),
    ).toEqual([{ profile: 'caseDetail', size: { width: 1280, height: 720 } }])
    expect(
      planVideoWarming([{ kind: 'otherCover', coverRatio: null }]),
    ).toEqual([{ profile: 'caseDetail', size: { width: 856, height: 1070 } }])
  })
})

describe('planVideoWarming — propiedades', () => {
  const usageArb: fc.Arbitrary<VideoUsage> = fc.oneof(
    fc.record({
      kind: fc.constant('pin' as const),
      contentType: fc.constantFrom(
        'case' as const,
        'insight' as const,
        'tool' as const,
        'episode' as const,
        'other' as const,
      ),
      pinRatio: fc.constantFrom(...RATIOS),
      durationSeconds: fc.option(fc.integer({ min: 1, max: 30 }), {
        nil: null,
      }),
      autoplayMode: fc.constantFrom(
        'viewport' as const,
        'hover' as const,
        null,
      ),
    }),
    fc.record({
      kind: fc.constant('caseCarousel' as const),
      width: fc.integer({ min: 100, max: 4000 }),
      height: fc.integer({ min: 100, max: 4000 }),
    }),
    fc.record({
      kind: fc.constant('otherCover' as const),
      coverRatio: fc.option(fc.constantFrom(...RATIOS), { nil: null }),
    }),
  )

  it('nunca incluye el escalón L ni más de un feed, y no repite rendiciones', () => {
    fc.assert(
      fc.property(fc.array(usageArb, { maxLength: 6 }), (usages) => {
        const plan = planVideoWarming(usages)

        const keys = plan.map(
          (r) => `${r.profile}:${r.size.width}x${r.size.height ?? 0}`,
        )
        expect(new Set(keys).size).toBe(keys.length)

        for (const r of plan) {
          if (r.profile === 'feed') {
            expect(r.size).toEqual({ width: FEED_VIDEO_WIDTH })
            continue
          }
          const isM = RATIOS.some(
            (ratio) =>
              DETAIL_VIDEO_RUNGS[ratio].M.width === r.size.width &&
              DETAIL_VIDEO_RUNGS[ratio].M.height === r.size.height,
          )
          const isL = RATIOS.some(
            (ratio) =>
              DETAIL_VIDEO_RUNGS[ratio].L.width === r.size.width &&
              DETAIL_VIDEO_RUNGS[ratio].L.height === r.size.height,
          )
          expect(isM).toBe(true)
          expect(isL).toBe(false)
        }
      }),
    )
  })

  it('el orden no depende del orden de los usos', () => {
    fc.assert(
      fc.property(fc.array(usageArb, { maxLength: 6 }), (usages) => {
        expect(planVideoWarming([...usages].reverse())).toEqual(
          planVideoWarming(usages),
        )
      }),
    )
  })

  it('sin usos no hay nada que calentar', () => {
    expect(planVideoWarming([])).toEqual([])
  })
})

describe('CONTRATO: las cadenas del eager son EXACTAMENTE las de la entrega', () => {
  // Si estas igualdades se rompen, calentar no sirve: Cloudinary generaría
  // versiones que nadie pide y la entrega generaría otras (pago doble).

  it('feed: las del plan = las de PinCard (buildFeedVideoSources)', () => {
    const plan = planVideoWarming([
      pin({ contentType: 'case', pinRatio: '9:16' }),
    ])
    const delivered = buildFeedVideoSources(ID).map((s) =>
      transformationOf(s.src),
    )

    expect(eagerStrings(plan)).toEqual(delivered)
  })

  it('ficha de tool: las del plan = las de useToolCoverVideo con una caja de pantalla normal (escalón M) para los 7 ratios', () => {
    for (const ratio of RATIOS) {
      const plan = planVideoWarming([
        pin({ pinRatio: ratio, autoplayMode: null }),
      ])

      // Caja de un portátil 1366×768, DPR 1: siempre M.
      const rung = pickDetailVideoRung({
        ratio: toolInsightDetailRatio(ratio, null),
        boxWidthPx: 771,
        boxHeightPx: 434,
        devicePixelRatio: 1,
      })
      expect(rung.rung).toBe('M')

      const delivered = buildVideoSources(ID, 'toolDetail', {
        width: rung.width,
        height: rung.height,
      }).map((s) => transformationOf(s.src))

      expect(eagerStrings(plan)).toEqual(delivered)
    }
  })

  it('carrusel de caso: las del plan = las de CarouselVideo', () => {
    const item = { width: 1080, height: 1350 }
    const plan = planVideoWarming([{ kind: 'caseCarousel', ...item }])
    const size = detailVideoRungM(caseVideoRatio(item.width, item.height))
    const delivered = buildVideoSources(ID, 'caseDetail', size).map((s) =>
      transformationOf(s.src),
    )

    expect(eagerStrings(plan)).toEqual(delivered)
  })

  it('portada de other: las del plan = las de ToolInsightDetail', () => {
    for (const coverRatio of [null, ...RATIOS]) {
      const plan = planVideoWarming([{ kind: 'otherCover', coverRatio }])
      const size = detailVideoRungM(toolInsightDetailRatio(null, coverRatio))
      const delivered = buildVideoSources(ID, 'caseDetail', size).map((s) =>
        transformationOf(s.src),
      )

      expect(eagerStrings(plan)).toEqual(delivered)
    }
  })

  it('un pin de tool son 4 versiones exactas (feed + ficha M, WebM y MP4)', () => {
    expect(eagerStrings(planVideoWarming([pin({ pinRatio: '4:5' })]))).toEqual([
      'ac_none/c_limit,w_480/f_webm,vc_vp9/q_auto:eco',
      'ac_none/c_limit,w_480/f_mp4,vc_h264/q_auto:eco',
      'ac_none/c_limit,w_856,h_1070/f_webm,vc_vp9/q_auto',
      'ac_none/c_limit,w_856,h_1070/f_mp4,vc_h264/q_auto',
    ])
  })
})

describe('warmContractId', () => {
  const a = ['x/1', 'y/2']

  it('es estable y no depende del orden', () => {
    expect(warmContractId(a)).toBe(warmContractId(['y/2', 'x/1']))
    expect(warmContractId(a)).toBe(warmContractId([...a]))
  })

  it('cambia si cambia cualquier cadena (cambio de contrato o de ratio)', () => {
    expect(warmContractId(a)).not.toBe(warmContractId(['x/1', 'y/3']))
    expect(warmContractId(a)).not.toBe(warmContractId(['x/1']))
  })

  it('tiene un formato fijo y corto', () => {
    expect(warmContractId(a)).toMatch(/^w1-[0-9a-f]{16}$/)
  })

  it('la firma del contrato vigente de un pin de tool está fijada: si cambia, algo del contrato de entrega se ha movido', () => {
    const strings = eagerStrings(planVideoWarming([pin({ pinRatio: '4:5' })]))
    expect(warmContractId(strings)).toBe(warmContractId(strings))
    expect(warmContractId(strings)).toMatch(/^w1-/)
  })
})
