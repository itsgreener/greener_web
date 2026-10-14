// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('@/app/admin/(panel)/contents/[id]/edit/pinActions', () => ({
  updatePinAction: vi.fn(async () => ({})),
}))

import { EditPinForm } from '@/app/admin/(panel)/contents/[id]/edit/PinList/EditPinForm'
import type { PinListItem } from '@/modules/pin/domain/pinRepository'

function pin(overrides: Partial<PinListItem> = {}): PinListItem {
  return {
    id: 'p1',
    contentId: 'c1',
    ratio: '16:9',
    label: 'Gancho',
    language: 'es',
    autoplayMode: null,
    alt: 'Alt',
    createdAt: '2026-10-14T10:00:00Z',
    media: null,
    ...overrides,
  }
}

const media = (kind: 'image' | 'video') => ({
  id: 'm1',
  kind,
  cloudinaryPublicId: 'greener/x',
})

function renderForm(item: PinListItem) {
  render(<EditPinForm pin={item} contentId="c1" derivedLabel={false} />)
}

describe('EditPinForm — autoplay solo para vídeos', () => {
  it('un pin de vídeo ofrece el autoplay con su valor actual', () => {
    renderForm(pin({ media: media('video'), autoplayMode: 'hover' }))

    expect(screen.getByLabelText('Autoplay')).toHaveValue('hover')
  })

  it('un pin de imagen no ofrece el autoplay, aunque arrastre un modo antiguo', () => {
    renderForm(pin({ media: media('image'), autoplayMode: 'hover' }))

    expect(screen.queryByLabelText('Autoplay')).not.toBeInTheDocument()
  })

  it('un pin todavía sin medio tampoco lo ofrece', () => {
    renderForm(pin({ media: null }))

    expect(screen.queryByLabelText('Autoplay')).not.toBeInTheDocument()
  })
})
