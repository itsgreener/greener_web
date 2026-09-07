import { describe, it, expect } from 'vitest'
import {
  deleteBlockMediaSchema,
  mediaKindSchema,
  mediaStatusSchema,
  registerImageForBlockSchema,
  registerVideoForBlockSchema,
} from '@/modules/media/domain/mediaAssetSchema'

const BLOCK_ID = '7a1f2e3d-4c5b-6a7d-8e9f-0a1b2c3d4e5f'
const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

describe('mediaKindSchema / mediaStatusSchema', () => {
  it('mediaKindSchema acepta image y video', () => {
    expect(mediaKindSchema.safeParse('image').success).toBe(true)
    expect(mediaKindSchema.safeParse('video').success).toBe(true)
  })

  it('mediaStatusSchema acepta processing/ready/error (§7.4)', () => {
    for (const status of ['processing', 'ready', 'error']) {
      expect(mediaStatusSchema.safeParse(status).success).toBe(true)
    }
  })
})

describe('registerImageForBlockSchema', () => {
  const base = {
    blockId: BLOCK_ID,
    contentId: CONTENT_ID,
    cloudinaryPublicId: 'greener/content/abc123',
    format: 'webp',
    width: 1200,
    height: 800,
    bytes: 500_000,
  }

  it('acepta una respuesta de Cloudinary válida', () => {
    expect(registerImageForBlockSchema.safeParse(base).success).toBe(true)
  })

  it('rechaza cloudinaryPublicId vacío', () => {
    expect(
      registerImageForBlockSchema.safeParse({ ...base, cloudinaryPublicId: '' })
        .success,
    ).toBe(false)
  })

  it.each(['width', 'height', 'bytes'] as const)(
    'rechaza %s en cero o negativo',
    (field) => {
      const result = registerImageForBlockSchema.safeParse({
        ...base,
        [field]: 0,
      })
      expect(result.success).toBe(false)
    },
  )

  it('rechaza width/height no enteros', () => {
    expect(
      registerImageForBlockSchema.safeParse({ ...base, width: 100.5 }).success,
    ).toBe(false)
  })

  it('rechaza bytes por encima de 5 MB — hueco que no existía hasta ahora, alineado con register_image_for_block (SQL) tras 20260907093000', () => {
    const result = registerImageForBlockSchema.safeParse({
      ...base,
      bytes: 5 * 1024 * 1024 + 1,
    })

    expect(result.success).toBe(false)
  })

  it('acepta exactamente 5 MB', () => {
    expect(
      registerImageForBlockSchema.safeParse({ ...base, bytes: 5 * 1024 * 1024 })
        .success,
    ).toBe(true)
  })
})

describe('registerVideoForBlockSchema', () => {
  const base = {
    blockId: BLOCK_ID,
    contentId: CONTENT_ID,
    cloudinaryPublicId: 'greener/content/videos/abc123',
    format: 'mp4',
    width: 1920,
    height: 1080,
    durationSeconds: 30,
    bytes: 20 * 1024 * 1024,
  }

  it('acepta un vídeo válido dentro de límites', () => {
    expect(registerVideoForBlockSchema.safeParse(base).success).toBe(true)
  })

  it('redondea la duración hacia arriba (transform Math.ceil) — igual que hace el ABM antes de llamar a la función SQL', () => {
    const result = registerVideoForBlockSchema.safeParse({
      ...base,
      durationSeconds: 29.2,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.durationSeconds).toBe(30)
    }
  })

  it('rechaza una duración por encima de 180 s, coincidiendo con register_video_for_block (SQL)', () => {
    const result = registerVideoForBlockSchema.safeParse({
      ...base,
      durationSeconds: 181,
    })

    expect(result.success).toBe(false)
  })

  it('acepta exactamente 180 s', () => {
    expect(
      registerVideoForBlockSchema.safeParse({ ...base, durationSeconds: 180 })
        .success,
    ).toBe(true)
  })

  it('rechaza bytes por encima de 100 MB, coincidiendo con el límite SQL', () => {
    const result = registerVideoForBlockSchema.safeParse({
      ...base,
      bytes: 100 * 1024 * 1024 + 1,
    })

    expect(result.success).toBe(false)
  })

  it('rechaza duración cero o negativa', () => {
    expect(
      registerVideoForBlockSchema.safeParse({ ...base, durationSeconds: 0 })
        .success,
    ).toBe(false)
  })
})

describe('deleteBlockMediaSchema', () => {
  const base = {
    blockId: BLOCK_ID,
    mediaId: '9f8e7d6c-5b4a-3f2e-8d0c-b9a8f7e6d5c4',
    cloudinaryPublicId: 'greener/content/abc123',
    kind: 'image' as const,
  }

  it('acepta una entrada válida de image o video', () => {
    expect(deleteBlockMediaSchema.safeParse(base).success).toBe(true)
    expect(
      deleteBlockMediaSchema.safeParse({ ...base, kind: 'video' }).success,
    ).toBe(true)
  })

  it('rechaza un mediaId que no sea uuid', () => {
    expect(
      deleteBlockMediaSchema.safeParse({ ...base, mediaId: 'no-es-uuid' })
        .success,
    ).toBe(false)
  })

  it('rechaza cloudinaryPublicId vacío — sin él no se puede borrar el archivo en Cloudinary', () => {
    expect(
      deleteBlockMediaSchema.safeParse({ ...base, cloudinaryPublicId: '' })
        .success,
    ).toBe(false)
  })

  it('rechaza un kind que no sea image ni video', () => {
    expect(
      deleteBlockMediaSchema.safeParse({ ...base, kind: 'audio' }).success,
    ).toBe(false)
  })
})
