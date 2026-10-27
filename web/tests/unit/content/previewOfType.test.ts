import { describe, expect, it } from 'vitest'

import {
  previewOfType,
  type PreviewResolution,
} from '@/modules/content/application/resolvePreviewContext'
import type { PublicContent } from '@/modules/content/domain/publicContent'
import type { PublicContentReader } from '@/modules/content/domain/publicContentReader'

const reader = {} as PublicContentReader

function resolution(type: string | null, isPreview = false): PreviewResolution {
  return {
    content: type ? ({ id: 'c1', type } as unknown as PublicContent) : null,
    reader,
    isPreview,
  }
}

describe('previewOfType', () => {
  it('devuelve la resolución tal cual si el tipo está permitido', () => {
    const input = resolution('case', true)

    const result = previewOfType(input, ['case', 'episode'])

    expect(result).not.toBeNull()
    expect(result?.content.type).toBe('case')
    expect(result?.reader).toBe(reader)
    expect(result?.isPreview).toBe(true)
  })

  it('un tipo no permitido se trata como inexistente', () => {
    expect(previewOfType(resolution('tool'), ['case', 'episode'])).toBeNull()
    expect(previewOfType(resolution('case'), ['tool'])).toBeNull()
  })

  it('sin contenido devuelve null', () => {
    expect(previewOfType(resolution(null), ['case'])).toBeNull()
  })

  it('lista de tipos vacía: nunca sirve nada', () => {
    expect(previewOfType(resolution('case'), [])).toBeNull()
  })
})
