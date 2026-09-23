import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const {
  mockInit,
  mockTrack,
} = vi.hoisted(() => ({
  mockInit: vi.fn(),
  mockTrack: vi.fn(),
}))

vi.mock(
  '@plausible-analytics/tracker',
  () => ({
    init: mockInit,
    track: mockTrack,
  }),
)

describe(
  'analytics',
  () => {
    beforeEach(() => {
      vi.clearAllMocks()
      vi.resetModules()
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it(
      'inicializa Plausible en producción cuando hay dominio',
      async () => {
        vi.stubEnv(
          'NODE_ENV',
          'production',
        )

        const {
          initAnalytics,
        } = await import(
          '@/modules/analytics/analytics'
        )

        initAnalytics(
          'www.example.com',
        )

        expect(
          mockInit,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          mockInit,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            domain:
              'www.example.com',

            autoCapturePageviews:
              true,

            captureOnLocalhost:
              false,

            logging:
              false,

            transformRequest:
              expect.any(
                Function,
              ),
          }),
        )
      },
    )

    it(
      'no inicializa Plausible fuera de producción',
      async () => {
        vi.stubEnv(
          'NODE_ENV',
          'development',
        )

        const {
          initAnalytics,
        } = await import(
          '@/modules/analytics/analytics'
        )

        initAnalytics(
          'www.example.com',
        )

        expect(
          mockInit,
        ).not
          .toHaveBeenCalled()
      },
    )

    it(
      'no inicializa Plausible si no hay dominio configurado',
      async () => {
        vi.stubEnv(
          'NODE_ENV',
          'production',
        )

        const {
          initAnalytics,
        } = await import(
          '@/modules/analytics/analytics'
        )

        initAnalytics(
          undefined,
        )

        expect(
          mockInit,
        ).not
          .toHaveBeenCalled()
      },
    )

    it(
      'solo inicializa el tracker una vez',
      async () => {
        vi.stubEnv(
          'NODE_ENV',
          'production',
        )

        const {
          initAnalytics,
        } = await import(
          '@/modules/analytics/analytics'
        )

        initAnalytics(
          'www.example.com',
        )

        initAnalytics(
          'www.example.com',
        )

        expect(
          mockInit,
        ).toHaveBeenCalledTimes(
          1,
        )
      },
    )

    it(
      'envía eventos con propiedades convertidas a string',
      async () => {
        vi.stubEnv(
          'NODE_ENV',
          'production',
        )

        const {
          initAnalytics,
          trackAnalyticsEvent,
        } = await import(
          '@/modules/analytics/analytics'
        )

        initAnalytics(
          'www.example.com',
        )

        trackAnalyticsEvent(
          'Feed Depth',
          {
            section:
              'home',

            round:
              2,

            batch:
              4,
          },
        )

        expect(
          mockTrack,
        ).toHaveBeenCalledWith(
          'Feed Depth',
          {
            props: {
              section:
                'home',

              round:
                '2',

              batch:
                '4',
            },
          },
        )
      },
    )

    it(
      'conserva un evento disparado antes de inicializar y lo envía después',
      async () => {
        vi.stubEnv(
          'NODE_ENV',
          'production',
        )

        const {
          initAnalytics,
          trackAnalyticsEvent,
        } = await import(
          '@/modules/analytics/analytics'
        )

        trackAnalyticsEvent(
          'Insight Open',
          {
            insightId:
              'insight-1',
          },
        )

        expect(
          mockTrack,
        ).not
          .toHaveBeenCalled()

        initAnalytics(
          'www.example.com',
        )

        expect(
          mockTrack,
        ).toHaveBeenCalledWith(
          'Insight Open',
          {
            props: {
              insightId:
                'insight-1',
            },
          },
        )
      },
    )

    it(
      'descarta eventos pendientes si Plausible está deshabilitado',
      async () => {
        vi.stubEnv(
          'NODE_ENV',
          'development',
        )

        const {
          initAnalytics,
          trackAnalyticsEvent,
        } = await import(
          '@/modules/analytics/analytics'
        )

        trackAnalyticsEvent(
          'Insight Open',
          {
            insightId:
              'insight-1',
          },
        )

        initAnalytics(
          'www.example.com',
        )

        expect(
          mockTrack,
        ).not
          .toHaveBeenCalled()
      },
    )

    it(
      'excluye las rutas de administración y autenticación',
      async () => {
        vi.stubEnv(
          'NODE_ENV',
          'production',
        )

        const {
          initAnalytics,
        } = await import(
          '@/modules/analytics/analytics'
        )

        initAnalytics(
          'www.example.com',
        )

        const config =
          mockInit.mock
            .calls[0]?.[0] as {
            transformRequest?: (
              payload: {
                n: string
                u: string
                d: string
              },
            ) =>
              | {
                  n: string
                  u: string
                  d: string
                }
              | null
          }

        const publicPayload = {
          n:
            'pageview',

          u:
            'https://www.example.com/work/caso',

          d:
            'www.example.com',
        }

        const adminPayload = {
          n:
            'pageview',

          u:
            'https://www.example.com/admin/contents',

          d:
            'www.example.com',
        }

        const authPayload = {
          n:
            'pageview',

          u:
            'https://www.example.com/auth/callback',

          d:
            'www.example.com',
        }

        expect(
          config.transformRequest?.(
            publicPayload,
          ),
        ).toBe(
          publicPayload,
        )

        expect(
          config.transformRequest?.(
            adminPayload,
          ),
        ).toBeNull()

        expect(
          config.transformRequest?.(
            authPayload,
          ),
        ).toBeNull()
      },
    )
  },
)