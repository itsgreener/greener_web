import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import {
  DETAIL_VIDEO_RUNGS,
  FEED_VIDEO_WIDTH,
} from '@/modules/media/domain/mediaDelivery'
import { buildVideoTransformations } from '@/modules/media/infrastructure/cloudinaryUrl'
import {
  planVideoWarming,
  warmContractId,
  type VideoUsage,
} from '@/modules/media/domain/warmPlan'
import {
  buildWarmJobs,
  closestClosedRatio as scriptClosest,
  estimateJobsCredits,
  FEED_WIDTH,
  MAX_ANIMATED_SECONDS,
  parseArgs,
  RUNG_M,
  transformationsForUsages,
} from '../../../scripts/warm-cloudinary.mjs'
import { closestClosedRatio } from '@/modules/media/domain/closestRatio'
import { PIN_ANIMATION_LIMITS } from '@/modules/media/domain/mediaLimits'

import { pinRatioSchema } from '@/modules/shared/domain/ratio'
const ratio = fc.constantFrom(...pinRatioSchema.options)

const usage: fc.Arbitrary<VideoUsage> = fc.oneof(
  fc.record({
    kind: fc.constant('pin' as const),
    contentType: fc.constantFrom(
      'case' as const,
      'insight' as const,
      'tool' as const,
      'episode' as const,
      'other' as const,
    ),
    pinRatio: ratio,
    durationSeconds: fc.option(fc.integer({ min: 1, max: 180 }), {
      nil: null,
    }),
    autoplayMode: fc.constantFrom('viewport' as const, 'hover' as const, null),
  }),
  fc.record({
    kind: fc.constant('caseCarousel' as const),
    width: fc.integer({ min: 100, max: 4000 }),
    height: fc.integer({ min: 100, max: 4000 }),
  }),
  fc.record({
    kind: fc.constant('otherCover' as const),
    coverRatio: fc.option(ratio, { nil: null }),
  }),
)

function appSide(usages: VideoUsage[]) {
  const renditions = planVideoWarming(usages)
  if (renditions.length === 0) return null

  const transformations = renditions.flatMap((r) =>
    buildVideoTransformations(r.profile, r.size),
  )

  return { transformations, contract: warmContractId(transformations) }
}

describe('scripts/warm-cloudinary.mjs — copia fiel del contrato', () => {
  it('constantes', () => {
    expect(FEED_WIDTH).toBe(FEED_VIDEO_WIDTH)
    expect(MAX_ANIMATED_SECONDS).toBe(PIN_ANIMATION_LIMITS.maxDurationSeconds)

    for (const r of pinRatioSchema.options) {
      expect(RUNG_M[r]).toEqual(DETAIL_VIDEO_RUNGS[r].M)
    }
  })

  it('ratio más cercano igual al de la app', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 5000 }),
        fc.integer({ min: 50, max: 5000 }),
        (w, h) => {
          expect(scriptClosest(w, h)).toBe(closestClosedRatio(w, h))
        },
      ),
      { numRuns: 2000 },
    )
  })

  it('plan, cadenas y contrato idénticos a los de la app, con usos al azar', () => {
    fc.assert(
      fc.property(fc.array(usage, { maxLength: 6 }), (usages) => {
        expect(transformationsForUsages(usages)).toEqual(appSide(usages))
      }),
      { numRuns: 3000 },
    )
  })
})

describe('scripts/warm-cloudinary.mjs — decisión', () => {
  const pinUsage = {
    kind: 'pin',
    contentType: 'tool',
    pinRatio: '4:5',
    durationSeconds: 6,
    autoplayMode: 'viewport',
  }

  const media = [
    {
      id: 'a',
      publicId: 'v/a',
      durationSeconds: 6,
      warmedContract: null,
    },
    {
      id: 'b',
      publicId: 'v/b',
      durationSeconds: 6,
      warmedContract: transformationsForUsages([pinUsage])!.contract,
    },
    { id: 'c', publicId: 'v/c', durationSeconds: 6, warmedContract: null },
  ]

  const usagesByMedia = new Map([
    ['a', [pinUsage]],
    ['b', [pinUsage]],
    // c: sin usos que calentar
    ['c', []],
  ])

  it('salta lo ya calentado y lo que no tiene nada que calentar', () => {
    const { jobs, alreadyWarm } = buildWarmJobs({ media, usagesByMedia })

    expect(jobs.map((j) => j.id)).toEqual(['a'])
    expect(alreadyWarm.map((m) => m.id)).toEqual(['b'])
  })

  it('--force repite lo ya calentado', () => {
    const { jobs } = buildWarmJobs({ media, usagesByMedia, force: true })

    expect(jobs.map((j) => j.id)).toEqual(['a', 'b'])
  })

  it('estimación: por segundo y cadena; avisa de las duraciones desconocidas', () => {
    const jobs = [
      { durationSeconds: 10, transformations: ['x', 'y'] },
      { durationSeconds: null, transformations: ['x'] },
    ]

    const estimate = estimateJobsCredits(jobs)

    expect(estimate.low).toBeCloseTo(0.04)
    expect(estimate.high).toBeCloseTo(0.08)
    expect(estimate.unknownDuration).toBe(1)
  })

  it('por defecto simula, con tope de gasto, y rechaza lo desconocido', () => {
    expect(parseArgs([])).toEqual({
      execute: false,
      check: false,
      force: false,
      includeDrafts: false,
      content: undefined,
      maxCredits: 5,
    })
    expect(() => parseArgs(['--exceute'])).toThrow(/desconocida/)
    expect(() => parseArgs(['--max-credits=0'])).toThrow(/max-credits/)
    expect(() => parseArgs(['--check', '--execute'])).toThrow(/no se combinan/)
  })
})
