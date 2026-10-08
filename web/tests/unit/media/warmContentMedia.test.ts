import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/modules/media/infrastructure/cloudinaryServer', () => ({
  warmVideoRenditions: vi.fn(),
}))

vi.mock('@/modules/media/infrastructure/supabaseWarmRepository', () => ({
  readContentWarmInfo: vi.fn(),
  markWarmedWithService: vi.fn(),
  markWarmedWithSession: vi.fn(),
}))

import {
  prepareContentWarming,
  runWarmJobs,
  countPendingWarming,
  warmContentMedia,
} from '@/modules/media/application/warmContentMedia'
import { warmVideoRenditions } from '@/modules/media/infrastructure/cloudinaryServer'
import {
  markWarmedWithService,
  markWarmedWithSession,
  readContentWarmInfo,
} from '@/modules/media/infrastructure/supabaseWarmRepository'
import { buildVideoTransformations } from '@/modules/media/infrastructure/cloudinaryUrl'
import { DETAIL_VIDEO_RUNGS } from '@/modules/media/domain/mediaDelivery'
import {
  planVideoWarming,
  warmContractId,
} from '@/modules/media/domain/warmPlan'

const mockRead = vi.mocked(readContentWarmInfo)
const mockWarm = vi.mocked(warmVideoRenditions)
const mockMarkService = vi.mocked(markWarmedWithService)
const mockMarkSession = vi.mocked(markWarmedWithSession)

const PUBLIC_ID = 'greener/content/videos/abc'

function toolPinCandidate(warmedContract: string | null = null) {
  return {
    mediaId: 'm1',
    cloudinaryPublicId: PUBLIC_ID,
    warmedContract,
    usages: [
      {
        kind: 'pin' as const,
        contentType: 'tool' as const,
        pinRatio: '4:5' as const,
        durationSeconds: 6,
        autoplayMode: 'viewport' as const,
      },
    ],
  }
}

/** Las cadenas que debe pedir un pin de tool de 6 s con autoplay a 4:5. */
const EXPECTED = [
  ...buildVideoTransformations('feed', { width: 480 }),
  ...buildVideoTransformations('toolDetail', {
    width: DETAIL_VIDEO_RUNGS['4:5'].M.width,
    height: DETAIL_VIDEO_RUNGS['4:5'].M.height,
  }),
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockWarm.mockResolvedValue(undefined)
  mockMarkService.mockResolvedValue(undefined)
  mockMarkSession.mockResolvedValue(undefined)
})

describe('prepareContentWarming', () => {
  it('pide las cadenas del contrato (feed + ficha M) de un pin de tool', async () => {
    mockRead.mockResolvedValueOnce({
      status: 'published',
      candidates: [toolPinCandidate()],
    })

    const jobs = await prepareContentWarming('c1')

    expect(jobs).toHaveLength(1)
    expect([...jobs[0].transformations].sort()).toEqual([...EXPECTED].sort())
    expect(jobs[0].contract).toBe(warmContractId(EXPECTED))
    expect(jobs[0].cloudinaryPublicId).toBe(PUBLIC_ID)
  })

  it('el plan del dominio y el de la aplicación coinciden', async () => {
    const candidate = toolPinCandidate()

    mockRead.mockResolvedValueOnce({
      status: 'scheduled',
      candidates: [candidate],
    })

    const [job] = await prepareContentWarming('c1')

    const renditions = planVideoWarming(candidate.usages)

    expect(job.transformations).toEqual(
      renditions.flatMap((r) => buildVideoTransformations(r.profile, r.size)),
    )
  })

  it('un borrador no se calienta, salvo con includeDraft', async () => {
    mockRead.mockResolvedValue({
      status: 'draft',
      candidates: [toolPinCandidate()],
    })

    expect(await prepareContentWarming('c1')).toEqual([])
    expect(
      await prepareContentWarming('c1', { includeDraft: true }),
    ).toHaveLength(1)
  })

  it('un vídeo ya calentado con el contrato vigente no se repite (repetir cobra)', async () => {
    mockRead.mockResolvedValueOnce({
      status: 'published',
      candidates: [toolPinCandidate(warmContractId(EXPECTED))],
    })

    expect(await prepareContentWarming('c1')).toEqual([])
  })

  it('con otro contrato guardado (cambió la entrega o el ratio) vuelve a calentar', async () => {
    mockRead.mockResolvedValueOnce({
      status: 'published',
      candidates: [toolPinCandidate('w1-0000000000000000')],
    })

    expect(await prepareContentWarming('c1')).toHaveLength(1)
  })

  it('force repite aunque figure calentado', async () => {
    mockRead.mockResolvedValueOnce({
      status: 'published',
      candidates: [toolPinCandidate(warmContractId(EXPECTED))],
    })

    expect(await prepareContentWarming('c1', { force: true })).toHaveLength(1)
  })

  it('un vídeo que no se anima ni sale en ficha no genera trabajo', async () => {
    mockRead.mockResolvedValueOnce({
      status: 'published',
      candidates: [
        {
          mediaId: 'm2',
          cloudinaryPublicId: PUBLIC_ID,
          warmedContract: null,
          usages: [
            {
              kind: 'pin' as const,
              contentType: 'case' as const,
              pinRatio: '4:5' as const,
              durationSeconds: 6,
              autoplayMode: null,
            },
          ],
        },
      ],
    })

    expect(await prepareContentWarming('c1')).toEqual([])
  })
})

describe('runWarmJobs', () => {
  const job = {
    mediaId: 'm1',
    cloudinaryPublicId: PUBLIC_ID,
    transformations: ['a', 'b'],
    contract: 'w1-x',
  }

  it('calienta y anota el contrato', async () => {
    const result = await runWarmJobs([job])

    expect(result).toEqual({ warmed: 1, failed: 0 })
    expect(mockWarm).toHaveBeenCalledWith(PUBLIC_ID, ['a', 'b'])
    expect(mockMarkService).toHaveBeenCalledWith('m1', 'w1-x')
  })

  it('si Cloudinary falla, anota el error, sigue con el resto y nunca lanza', async () => {
    mockWarm.mockRejectedValueOnce(new Error('Cloudinary caído'))

    const second = { ...job, mediaId: 'm2' }

    const result = await runWarmJobs([job, second])

    expect(result).toEqual({ warmed: 1, failed: 1 })
    expect(mockMarkService).toHaveBeenNthCalledWith(
      1,
      'm1',
      'w1-x',
      'Cloudinary caído',
    )
    expect(mockMarkService).toHaveBeenNthCalledWith(2, 'm2', 'w1-x')
  })

  it('si falla hasta anotar el error, tampoco lanza', async () => {
    mockWarm.mockRejectedValueOnce(new Error('x'))
    mockMarkService.mockRejectedValueOnce(new Error('y'))

    await expect(runWarmJobs([job])).resolves.toEqual({
      warmed: 0,
      failed: 1,
    })
  })

  it('si Cloudinary acepta pero no se puede anotar, cuenta como fallo', async () => {
    mockMarkService.mockRejectedValueOnce(new Error('rpc'))

    await expect(runWarmJobs([job])).resolves.toEqual({
      warmed: 0,
      failed: 1,
    })
  })
})

describe('warmContentMedia (botón del ABM)', () => {
  it('anota con la sesión del admin, no con la clave de servicio', async () => {
    mockRead.mockResolvedValueOnce({
      status: 'draft',
      candidates: [toolPinCandidate()],
    })

    const result = await warmContentMedia('c1', { includeDraft: true })

    expect(result).toEqual({ warmed: 1, failed: 0 })
    expect(mockMarkSession).toHaveBeenCalledTimes(1)
    expect(mockMarkService).not.toHaveBeenCalled()
  })
})

describe('countPendingWarming', () => {
  it('cuenta los pendientes también en borrador y no cuenta los calentados', async () => {
    mockRead.mockResolvedValueOnce({
      status: 'draft',
      candidates: [
        toolPinCandidate(),
        { ...toolPinCandidate(warmContractId(EXPECTED)), mediaId: 'm9' },
      ],
    })

    expect(await countPendingWarming('c1')).toBe(1)
  })
})
