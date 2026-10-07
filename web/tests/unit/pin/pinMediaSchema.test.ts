import { describe, it, expect } from 'vitest'

import {
  attachPinImageSchema,
  attachPinVideoSchema,
  detachPinMediaSchema,
} from '@/modules/pin/domain/pinMediaSchema'

const PIN_ID = '7a1f2e3d-4c5b-6a7d-8e9f-0a1b2c3d4e5f'
const MEDIA_ID = '9f8e7d6c-5b4a-3f2e-8d0c-b9a8f7e6d5c4'

describe('attachPinImageSchema', () => {
  const base = {
    pinId: PIN_ID,
    cloudinaryPublicId: 'greener/content/abc123',
    format: 'webp',
    width: 1200,
    height: 800,
    bytes: 500_000,
  }

  it('acepta una entrada válida', () => {
    expect(attachPinImageSchema.safeParse(base).success).toBe(true)
  })

  it('rechaza bytes por encima de 5 MB — mismo límite que attach_pin_image (SQL)', () => {
    expect(
      attachPinImageSchema.safeParse({ ...base, bytes: 5 * 1024 * 1024 + 1 })
        .success,
    ).toBe(false)
  })

  it('un pin es un único medio: el esquema no tiene slideOrder', () => {
    const parsed = attachPinImageSchema.safeParse({ ...base, slideOrder: 3 })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data).not.toHaveProperty('slideOrder')
  })
})

describe('attachPinVideoSchema', () => {
  const base = {
    pinId: PIN_ID,
    cloudinaryPublicId: 'greener/content/videos/abc123',
    format: 'mp4',
    width: 1080,
    height: 1080,
    durationSeconds: 3,
    bytes: 2 * 1024 * 1024,
  }

  it('acepta una animación válida', () => {
    expect(attachPinVideoSchema.safeParse(base).success).toBe(true)
  })

  it('rechaza más de 15 segundos — techo absoluto de un vídeo de pin (el de las tools), no los 180s de un vídeo de caso', () => {
    expect(
      attachPinVideoSchema.safeParse({ ...base, durationSeconds: 16 }).success,
    ).toBe(false)
  })

  it('acepta exactamente 15 segundos (el límite por tipo de contenido lo aplica SQL)', () => {
    expect(
      attachPinVideoSchema.safeParse({ ...base, durationSeconds: 15 }).success,
    ).toBe(true)
  })

  it('redondea la duración hacia arriba, igual que el vídeo del carrusel de caso', () => {
    const result = attachPinVideoSchema.safeParse({
      ...base,
      durationSeconds: 4.2,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.durationSeconds).toBe(5)
    }
  })

  it('rechaza bytes por encima de 100 MB', () => {
    expect(
      attachPinVideoSchema.safeParse({
        ...base,
        bytes: 100 * 1024 * 1024 + 1,
      }).success,
    ).toBe(false)
  })
})

describe('detachPinMediaSchema', () => {
  const base = {
    pinId: PIN_ID,
    mediaId: MEDIA_ID,
    cloudinaryPublicId: 'greener/content/abc123',
    kind: 'image' as const,
  }

  it('acepta una entrada válida de image o video', () => {
    expect(detachPinMediaSchema.safeParse(base).success).toBe(true)
    expect(
      detachPinMediaSchema.safeParse({ ...base, kind: 'video' }).success,
    ).toBe(true)
  })

  it('rechaza un mediaId inválido', () => {
    expect(
      detachPinMediaSchema.safeParse({ ...base, mediaId: 'no-es-uuid' })
        .success,
    ).toBe(false)
  })
})
