// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { isPreviewRequest } from '@/modules/analytics/previewRequest'

describe('isPreviewRequest en el servidor', () => {
  it('sin window devuelve false en vez de lanzar', () => {
    expect(typeof window).toBe('undefined')
    expect(isPreviewRequest()).toBe(false)
  })
})
