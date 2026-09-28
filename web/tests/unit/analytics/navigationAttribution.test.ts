// @vitest-environment jsdom

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  consumeNavigationSource,
  rememberNavigationSource,
} from '@/modules/analytics/navigationAttribution'

describe(
  'navigation attribution',
  () => {
    beforeEach(() => {
      window.sessionStorage.clear()

      window.history.replaceState(
        {},
        '',
        '/',
      )

      vi.useRealTimers()
    })

    it(
      'guarda y recupera la sección para el destino correcto',
      () => {
        rememberNavigationSource(
          '/work/caso-1',
          'home',
        )

        window.history.replaceState(
          {},
          '',
          '/work/caso-1',
        )

        expect(
          consumeNavigationSource(),
        ).toBe(
          'home',
        )
      },
    )

    it(
      'devuelve direct cuando no existe atribución',
      () => {
        window.history.replaceState(
          {},
          '',
          '/work/caso-1',
        )

        expect(
          consumeNavigationSource(),
        ).toBe(
          'direct',
        )
      },
    )

    it(
      'no atribuye una navegación a una página diferente',
      () => {
        rememberNavigationSource(
          '/work/caso-1',
          'home',
        )

        window.history.replaceState(
          {},
          '',
          '/tools/tool-1',
        )

        expect(
          consumeNavigationSource(),
        ).toBe(
          'direct',
        )
      },
    )

    it(
      'consume el valor una sola vez',
      () => {
        rememberNavigationSource(
          '/work/caso-1',
          'recommendations',
        )

        window.history.replaceState(
          {},
          '',
          '/work/caso-1',
        )

        expect(
          consumeNavigationSource(),
        ).toBe(
          'recommendations',
        )

        expect(
          consumeNavigationSource(),
        ).toBe(
          'direct',
        )
      },
    )

    it(
      'descarta atribuciones antiguas',
      () => {
        vi.useFakeTimers()

        vi.setSystemTime(
          new Date(
            '2026-09-28T10:00:00Z',
          ),
        )

        rememberNavigationSource(
          '/work/caso-1',
          'home',
        )

        vi.setSystemTime(
          new Date(
            '2026-09-28T10:31:00Z',
          ),
        )

        window.history.replaceState(
          {},
          '',
          '/work/caso-1',
        )

        expect(
          consumeNavigationSource(),
        ).toBe(
          'direct',
        )
      },
    )
  },
)