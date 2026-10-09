import { describe, expect, it } from 'vitest'

import {
  DETAIL_VIDEO_RUNGS,
  FEED_VIDEO_WIDTH,
  MEDIA_QUALITY,
} from '@/modules/media/domain/mediaDelivery'
import { buildVideoTransformations } from '@/modules/media/infrastructure/cloudinaryUrl'
import {
  BIG_MIN_BYTES,
  checkBigVideo,
  checkSmallClip,
  chainsFor,
  DEFAULT_MAX_CREDITS,
  DETAIL_QUALITY,
  deliveryUrl,
  estimateCredits,
  FEED_QUALITY,
  FEED_WIDTH,
  parseArgs,
  RUNG_M,
} from '../../../scripts/warm-probe.mjs'

import { pinRatioSchema } from '@/modules/shared/domain/ratio'
/**
 * El script de prueba contra Cloudinary real (paso 0 de la fase 2) tiene las
 * cadenas copiadas a mano porque un .mjs no puede importar el TypeScript de
 * la app. Este test impide que se desajusten: si el contrato de entrega
 * cambia, la prueba dejaría de probar lo que se sirve.
 */
describe('scripts/warm-probe.mjs — coincide con el contrato de entrega', () => {
  it('constantes del contrato', () => {
    expect(FEED_WIDTH).toBe(FEED_VIDEO_WIDTH)
    expect(FEED_QUALITY).toBe(MEDIA_QUALITY.feedVideo)
    expect(DETAIL_QUALITY).toBe(MEDIA_QUALITY.detailVideo)
  })

  it('escalón M de los 7 ratios', () => {
    for (const ratio of pinRatioSchema.options) {
      expect(RUNG_M[ratio]).toEqual(DETAIL_VIDEO_RUNGS[ratio].M)
    }
  })

  it('cadenas del feed = buildVideoTransformations("feed")', () => {
    expect(chainsFor('feed', '4:5')).toEqual(
      buildVideoTransformations('feed', { width: FEED_VIDEO_WIDTH }),
    )
  })

  it('cadenas de la ficha M = buildVideoTransformations("toolDetail") para los 7 ratios', () => {
    for (const ratio of pinRatioSchema.options) {
      expect(chainsFor('toolDetailM', ratio)).toEqual(
        buildVideoTransformations('toolDetail', DETAIL_VIDEO_RUNGS[ratio].M),
      )
    }
  })

  it('ratio desconocido: error claro', () => {
    expect(() => chainsFor('toolDetailM', '5:7')).toThrow(/Ratio no válido/)
  })
})

describe('scripts/warm-probe.mjs — utilidades', () => {
  it('URL de entrega con la forma de la app', () => {
    expect(deliveryUrl('c', 'greener/content/videos/x', 'a/b')).toBe(
      'https://res.cloudinary.com/c/video/upload/a/b/greener/content/videos/x',
    )
  })

  it('por defecto es una simulación, sin repetir y con tope de gasto', () => {
    expect(parseArgs(['--small=a'])).toEqual({
      small: 'a',
      big: undefined,
      ratio: '4:5',
      execute: false,
      status: false,
      probeDelivery: false,
      repeat: false,
      maxCredits: DEFAULT_MAX_CREDITS,
    })
    expect(
      parseArgs([
        '--small=a',
        '--big=b',
        '--ratio=16:9',
        '--execute',
        '--repeat',
        '--max-credits=1.5',
      ]),
    ).toMatchObject({
      big: 'b',
      ratio: '16:9',
      execute: true,
      repeat: true,
      maxCredits: 1.5,
    })
    expect(
      parseArgs(['--status', '--small=a', '--probe-delivery']),
    ).toMatchObject({ status: true, probeDelivery: true, execute: false })
  })

  it('un --max-credits inválido falla', () => {
    expect(() => parseArgs(['--max-credits=abc'])).toThrow(/max-credits/)
    expect(() => parseArgs(['--max-credits=0'])).toThrow(/max-credits/)
  })

  it('una opción desconocida falla en vez de ignorarse', () => {
    expect(() => parseArgs(['--exceute'])).toThrow(/desconocida/)
  })

  it('estimación de créditos: 1/500 a 1/250 por segundo y rendición', () => {
    const { low, high } = estimateCredits(10, 2)
    expect(low).toBeCloseTo(0.04)
    expect(high).toBeCloseTo(0.08)
  })
})

describe('scripts/warm-probe.mjs — guardas de gasto (8 oct)', () => {
  const MB = 1024 * 1024

  it('un clip de tool normal sirve', () => {
    expect(checkSmallClip({ bytes: 3 * MB, duration: 7 })).toBeNull()
    expect(checkSmallClip({ bytes: 15 * MB, duration: 15 })).toBeNull()
  })

  it('el vídeo de 130 s y 45 MB de la primera ejecución NO sirve como clip pequeño', () => {
    expect(checkSmallClip({ bytes: 45_611_797, duration: 130.73 })).toMatch(
      /130\.7 s/,
    )
  })

  it('rechaza por peso o por duración desconocida', () => {
    expect(checkSmallClip({ bytes: 16 * MB, duration: 5 })).toMatch(/MB/)
    expect(checkSmallClip({ bytes: MB, duration: undefined })).toMatch(
      /duración/,
    )
  })

  it('el vídeo grande tiene que superar 40 MB', () => {
    expect(checkBigVideo({ bytes: BIG_MIN_BYTES })).toMatch(/no supera/)
    expect(checkBigVideo({ bytes: 45_611_797 })).toBeNull()
  })

  it('el peor caso de la primera ejecución habría superado el tope por defecto', () => {
    // 6 rendiciones de 130,7 s a 1/250 de crédito por segundo.
    const { high } = estimateCredits(130.73, 6)
    expect(high).toBeGreaterThan(DEFAULT_MAX_CREDITS)
  })
})
