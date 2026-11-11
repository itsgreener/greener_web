// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * Lista de pines de un episodio con carrusel (§2.150): casilla persistente y
 * ratio bloqueado en la edición de cada pin.
 */

const setPinsCarouselAction = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

vi.mock('@/app/admin/(panel)/contents/[id]/edit/episodeActions', () => ({
  setPinsCarouselAction: (...args: unknown[]) => setPinsCarouselAction(...args),
}))

vi.mock('@/app/admin/(panel)/contents/[id]/edit/pinActions', () => ({
  updatePinAction: vi.fn(async () => ({})),
  deletePinAction: vi.fn(),
  deleteAllPinsAction: vi.fn(),
}))

vi.mock('@/app/admin/(panel)/contents/[id]/edit/PinMediaManager', () => ({
  default: () => null,
}))

import PinList from '@/app/admin/(panel)/contents/[id]/edit/PinList'
import { EditPinForm } from '@/app/admin/(panel)/contents/[id]/edit/PinList/EditPinForm'
import type { PinListItem } from '@/modules/pin/domain/pinRepository'

const CONTENT_ID = '11111111-1111-4111-8111-111111111111'

function pin(id: string, ratio = '4:5'): PinListItem {
  return {
    id,
    contentId: CONTENT_ID,
    ratio,
    label: null,
    language: 'es',
    autoplayMode: null,
    alt: 'Alt',
    createdAt: '2026-11-11T10:00:00Z',
    media: null,
  } as PinListItem
}

function renderList(
  carousel: { enabled: boolean; ratiosMixed: boolean } | null,
  pins = [pin('a'), pin('b')],
) {
  render(
    <PinList
      contentId={CONTENT_ID}
      contentType="episode"
      pins={pins}
      fixedLanguage="es"
      carousel={carousel}
    />,
  )
}

const toggle = () =>
  screen.getByRole('checkbox', {
    name: 'Formar un carrusel con los pines de este episodio',
  })

beforeEach(() => {
  vi.clearAllMocks()
  setPinsCarouselAction.mockResolvedValue({ ok: true, enabled: false })
})

describe('PinList — casilla del carrusel', () => {
  it('fuera de un episodio no hay casilla', () => {
    renderList(null)

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('refleja el estado y lo desactiva con la acción', async () => {
    renderList({ enabled: true, ratiosMixed: false })

    expect(toggle()).toBeChecked()

    fireEvent.click(toggle())

    await waitFor(() =>
      expect(setPinsCarouselAction).toHaveBeenCalledWith(CONTENT_ID, false),
    )
  })

  it('la activa y, si la base de datos lo rechaza, enseña el motivo', async () => {
    setPinsCarouselAction.mockResolvedValue({
      ok: false,
      error: 'Todos los pines de un carrusel deben tener el mismo ratio.',
    })
    renderList({ enabled: false, ratiosMixed: false })

    fireEvent.click(toggle())

    expect(await screen.findByText(/mismo ratio/)).toBeVisible()
    expect(setPinsCarouselAction).toHaveBeenCalledWith(CONTENT_ID, true)
  })

  it('con ratios distintos no se puede activar', () => {
    renderList({ enabled: false, ratiosMixed: true }, [
      pin('a', '4:5'),
      pin('b', '1:1'),
    ])

    expect(toggle()).toBeDisabled()
  })
})

describe('EditPinForm — ratio con el carrusel activo', () => {
  it('lo bloquea pero sigue enviándolo (un control deshabilitado no viaja)', () => {
    const { container } = render(
      <EditPinForm
        pin={pin('a', '9:16')}
        contentId={CONTENT_ID}
        derivedLabel
        fixedLanguage="es"
        ratioLocked
      />,
    )

    expect(screen.getByLabelText('Ratio')).toBeDisabled()
    expect(
      container.querySelector('input[type="hidden"][name="ratio"]'),
    ).toHaveValue('9:16')
  })

  it('sin carrusel el ratio se edita como siempre', () => {
    const { container } = render(
      <EditPinForm
        pin={pin('a')}
        contentId={CONTENT_ID}
        derivedLabel
        fixedLanguage="es"
      />,
    )

    expect(screen.getByLabelText('Ratio')).toBeEnabled()
    expect(screen.getByLabelText('Ratio')).toHaveAttribute('name', 'ratio')
    expect(
      container.querySelector('input[type="hidden"][name="ratio"]'),
    ).toBeNull()
  })
})
