// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import {
  isPreviewRequest,
  PREVIEW_PARAM,
} from '@/modules/analytics/previewRequest'

function visit(search: string) {
  window.history.replaceState(null, '', `/work/mi-caso${search}`)
}

describe('isPreviewRequest', () => {
  afterEach(() => visit(''))

  it('el parámetro es «preview»', () => {
    expect(PREVIEW_PARAM).toBe('preview')
  })

  it('true si la URL trae ?preview=', () => {
    visit('?preview=token123')

    expect(isPreviewRequest()).toBe(true)
  })

  it('true aunque el valor esté vacío o vaya con otros parámetros', () => {
    visit('?pin=abc&preview=')

    expect(isPreviewRequest()).toBe(true)
  })

  it('false sin el parámetro', () => {
    visit('?pin=abc')

    expect(isPreviewRequest()).toBe(false)
  })

  it('false sin query', () => {
    visit('')

    expect(isPreviewRequest()).toBe(false)
  })
})
