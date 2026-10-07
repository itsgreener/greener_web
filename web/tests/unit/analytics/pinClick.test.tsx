// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fireEvent, render, screen } from '@testing-library/react'

import '@testing-library/jest-dom/vitest'

const { mockTrackAnalyticsEvent } = vi.hoisted(() => ({
  mockTrackAnalyticsEvent: vi.fn(),
}))

vi.mock('@/modules/analytics/analytics', () => ({
  trackAnalyticsEvent: mockTrackAnalyticsEvent,
}))

import { PinCard } from '@/components/pin/PinCard'

const STYLE = {
  x: 0,
  y: 0,
  width: 300,
  height: 300,
}

function preventNavigation(element: HTMLElement) {
  element.addEventListener('click', (event) => {
    event.preventDefault()
  })
}

describe('Pin Click analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registra un clic sobre un pin de imagen en la home', () => {
    render(
      <PinCard
        pin={{
          pinId: 'pin-image',

          destination: '/work/caso-1',

          ratio: '1:1',

          label: 'Caso 1',

          cta: 'Watch',

          alt: 'Caso 1',

          autoplayMode: null,

          media: [
            {
              kind: 'image',

              cloudinaryPublicId: 'image-1',
            },
          ],
        }}
        style={STYLE}
        analyticsContext={{
          section: 'home',

          destinationType: 'case',
        }}
      />,
    )

    const link = screen.getByRole('link')

    preventNavigation(link)

    fireEvent.click(link)

    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith(
      'Pin Click',
      {
        destinationType: 'case',

        section: 'home',

        pinType: 'image',
      },
      {
        interactive: true,
      },
    )
  })

  it('identifica como video un pin con un único vídeo', () => {
    render(
      <PinCard
        pin={{
          pinId: 'pin-video',

          destination: '/work/episodio',

          ratio: '16:9',

          label: null,

          cta: 'Watch',

          alt: 'Episodio',

          autoplayMode: null,

          media: [
            {
              kind: 'video',

              cloudinaryPublicId: 'video-1',
            },
          ],
        }}
        style={STYLE}
        analyticsContext={{
          section: 'channel',

          destinationType: 'channel',
        }}
      />,
    )

    const link = screen.getByRole('link')

    preventNavigation(link)

    fireEvent.click(link)

    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith(
      'Pin Click',
      {
        destinationType: 'channel',

        section: 'channel',

        pinType: 'video',
      },
      {
        interactive: true,
      },
    )
  })

  it('un pin siempre se identifica por su primer medio: no existe el tipo carousel', () => {
    render(
      <PinCard
        pin={{
          pinId: 'pin-multi',

          destination: '/insights/uno',

          ratio: '4:5',

          label: 'Insight',

          cta: 'Read',

          alt: 'Insight',

          autoplayMode: null,

          media: [
            {
              kind: 'image',

              cloudinaryPublicId: 'image-1',
            },

            {
              kind: 'image',

              cloudinaryPublicId: 'image-2',
            },
          ],
        }}
        style={STYLE}
        analyticsContext={{
          section: 'recommendations',

          destinationType: 'insight',
        }}
      />,
    )

    const link = screen.getByRole('link')

    preventNavigation(link)

    fireEvent.click(link)

    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith(
      'Pin Click',
      {
        destinationType: 'insight',

        section: 'recommendations',

        pinType: 'image',
      },
      {
        interactive: true,
      },
    )
  })

  it('incluye tag cuando exista un tag real en el contexto', () => {
    render(
      <PinCard
        pin={{
          pinId: 'pin-tag',

          destination: '/tools/tool-1',

          ratio: '1:1',

          label: 'Tool',

          cta: 'Use',

          alt: 'Tool',

          autoplayMode: null,

          media: [
            {
              kind: 'image',

              cloudinaryPublicId: 'image-1',
            },
          ],
        }}
        style={STYLE}
        analyticsContext={{
          section: 'tools',

          destinationType: 'tool',

          tag: 'automation',
        }}
      />,
    )

    const link = screen.getByRole('link')

    preventNavigation(link)

    fireEvent.click(link)

    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith(
      'Pin Click',
      {
        destinationType: 'tool',

        section: 'tools',

        tag: 'automation',

        pinType: 'image',
      },
      {
        interactive: true,
      },
    )
  })

  it('no registra analítica cuando PinCard se usa sin contexto analítico', () => {
    render(
      <PinCard
        pin={{
          pinId: 'preview-pin',

          destination: '/preview',

          ratio: '1:1',

          label: 'Preview',

          cta: null,

          alt: 'Preview',

          autoplayMode: null,

          media: [
            {
              kind: 'image',

              cloudinaryPublicId: 'preview',
            },
          ],
        }}
        style={STYLE}
      />,
    )

    const link = screen.getByRole('link')

    preventNavigation(link)

    fireEvent.click(link)

    expect(mockTrackAnalyticsEvent).not.toHaveBeenCalled()
  })
})
