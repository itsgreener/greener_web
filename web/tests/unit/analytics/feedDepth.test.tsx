// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  trackAnalyticsEvent: vi.fn(),
}))

vi.mock('@/modules/analytics/analytics', () => ({
  trackAnalyticsEvent: mocks.trackAnalyticsEvent,
}))

vi.mock('@/components/masonry/useMasonryPositions', () => ({
  useMasonryPositions: () => ({
    containerRef: { current: null },
    positioned: [],
    totalHeight: 0,
  }),
}))

import { FeedProvider } from '@/components/masonry/FeedProvider'
import { useFeed } from '@/components/masonry/Feed/useFeed'

const ITEM = {
  pinId: 'pin-1',
  contentId: 'content-1',
  kind: 'case',
  destination: '/work/case-1',
  ratio: '1:1',
  label: null,
  cta: 'Watch',
  alt: 'Pin de prueba',
  autoplayMode: null,
  media: [
    {
      kind: 'image' as const,
      cloudinaryPublicId: 'test/image',
    },
  ],
}

function wrapper({ children }: { children: ReactNode }) {
  return <FeedProvider>{children}</FeedProvider>
}

describe('Feed Depth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)

        if (url === '/api/feed/sessions' && init?.method === 'POST') {
          return new Response(
            JSON.stringify({
              sessionId: 'session-1',
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            },
          )
        }

        if (url === '/api/feed/session-1') {
          return new Response(
            JSON.stringify({
              items: [ITEM],
              cursor: 'cursor-1',
              round: 0,
              hasMore: true,
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            },
          )
        }

        throw new Error(`Fetch inesperado: ${url}`)
      }),
    )
  })

  it('registra Feed Depth con section, round y batch', async () => {
    renderHook(() => useFeed('home'), {
      wrapper,
    })

    await waitFor(() => {
      expect(mocks.trackAnalyticsEvent).toHaveBeenCalledWith(
        'Feed Depth',
        {
          section: 'home',
          round: 0,
          batch: 0,
        },
        {
          interactive: false,
        },
      )
    })
  })
})
