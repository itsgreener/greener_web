// @vitest-environment jsdom

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  render,
  waitFor,
} from '@testing-library/react'

import '@testing-library/jest-dom/vitest'

const {
  mockTrackAnalyticsEvent,
  mockConsumeNavigationSource,
} = vi.hoisted(() => ({
  mockTrackAnalyticsEvent:
    vi.fn(),

  mockConsumeNavigationSource:
    vi.fn(),
}))

vi.mock(
  '@/modules/analytics/analytics',
  () => ({
    trackAnalyticsEvent:
      mockTrackAnalyticsEvent,
  }),
)

vi.mock(
  '@/modules/analytics/navigationAttribution',
  () => ({
    consumeNavigationSource:
      mockConsumeNavigationSource,
  }),
)

import {
  ContentOpenTracker,
} from '@/modules/analytics/ContentOpenTracker'

describe(
  'ContentOpenTracker',
  () => {
    beforeEach(() => {
      vi.clearAllMocks()

      mockConsumeNavigationSource
        .mockReturnValue(
          'direct',
        )

      window.history.replaceState(
        {},
        '',
        '/',
      )
    })

    it(
      'registra Case Open con la sección de procedencia',
      async () => {
        mockConsumeNavigationSource
          .mockReturnValue(
            'home',
          )

        render(
          <ContentOpenTracker
            type="case"
            contentId="case-1"
          />,
        )

        await waitFor(
          () => {
            expect(
              mockTrackAnalyticsEvent,
            ).toHaveBeenCalledWith(
              'Case Open',
              {
                caseId:
                  'case-1',

                sourceSection:
                  'home',
              },
            )
          },
        )
      },
    )

    it(
      'usa direct cuando el caso no viene de un pin',
      async () => {
        render(
          <ContentOpenTracker
            type="case"
            contentId="case-2"
          />,
        )

        await waitFor(
          () => {
            expect(
              mockTrackAnalyticsEvent,
            ).toHaveBeenCalledWith(
              'Case Open',
              {
                caseId:
                  'case-2',

                sourceSection:
                  'direct',
              },
            )
          },
        )
      },
    )

    it(
      'registra Tool Open',
      async () => {
        render(
          <ContentOpenTracker
            type="tool"
            contentId="tool-1"
          />,
        )

        await waitFor(
          () => {
            expect(
              mockTrackAnalyticsEvent,
            ).toHaveBeenCalledWith(
              'Tool Open',
              {
                toolId:
                  'tool-1',

                action:
                  'open',
              },
            )
          },
        )
      },
    )

    it(
      'registra Insight Open',
      async () => {
        render(
          <ContentOpenTracker
            type="insight"
            contentId="insight-1"
          />,
        )

        await waitFor(
          () => {
            expect(
              mockTrackAnalyticsEvent,
            ).toHaveBeenCalledWith(
              'Insight Open',
              {
                insightId:
                  'insight-1',
              },
            )
          },
        )
      },
    )

    it(
      'no registra aperturas durante un preview firmado',
      async () => {
        window.history.replaceState(
          {},
          '',
          '/work/caso-1?preview=token-test',
        )

        render(
          <ContentOpenTracker
            type="case"
            contentId="case-1"
          />,
        )

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              0,
            ),
        )

        expect(
          mockTrackAnalyticsEvent,
        ).not
          .toHaveBeenCalled()

        expect(
          mockConsumeNavigationSource,
        ).not
          .toHaveBeenCalled()
      },
    )
  },
)