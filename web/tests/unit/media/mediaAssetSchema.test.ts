import { describe, it, expect } from 'vitest'
import {
  addCaseCarouselImageSchema,
  addCaseCarouselVideoSchema,
  mediaStatusSchema,
  removeCaseCarouselMediaSchema,
} from '@/modules/media/domain/mediaAssetSchema'
import { mediaKindSchema } from '@/modules/shared/domain/mediaKind'
const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const MEDIA_ID = '9f8e7d6c-5b4a-3f2e-8d0c-b9a8f7e6d5c4'

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

describe('addCaseCarouselImageSchema — límites de la imagen subida', () => {
  const base = {
    contentId: CONTENT_ID,
    cloudinaryPublicId: 'greener/content/abc123',
    format: 'webp',
    width: 1200,
    height: 800,
    bytes: 500_000,
    sortOrder: 0,
    alt: 'Equipo en el campo',
  }

  it('rechaza cloudinaryPublicId vacío', () => {
    expect(
      addCaseCarouselImageSchema.safeParse({ ...base, cloudinaryPublicId: '' })
        .success,
    ).toBe(false)
  })

  it.each(['width', 'height', 'bytes'] as const)(
    'rechaza %s en cero o negativo',
    (field) => {
      expect(
        addCaseCarouselImageSchema.safeParse({ ...base, [field]: 0 }).success,
      ).toBe(false)
    },
  )

  it('rechaza bytes por encima de 5 MB y acepta exactamente 5 MB', () => {
    expect(
      addCaseCarouselImageSchema.safeParse({
        ...base,
        bytes: 5 * 1024 * 1024 + 1,
      }).success,
    ).toBe(false)
    expect(
      addCaseCarouselImageSchema.safeParse({ ...base, bytes: 5 * 1024 * 1024 })
        .success,
    ).toBe(true)
  })
})

describe('addCaseCarouselVideoSchema — límites del vídeo subido', () => {
  const base = {
    contentId: CONTENT_ID,
    cloudinaryPublicId: 'greener/content/videos/abc123',
    format: 'mp4',
    width: 1920,
    height: 1080,
    durationSeconds: 30,
    bytes: 20 * 1024 * 1024,
    sortOrder: 0,
    alt: 'Recorrido por la planta',
  }

  it('redondea la duración hacia arriba (transform Math.ceil)', () => {
    const result = addCaseCarouselVideoSchema.safeParse({
      ...base,
      durationSeconds: 29.2,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.durationSeconds).toBe(30)
    }
  })

  it('rechaza una duración por encima de 180 s', () => {
    expect(
      addCaseCarouselVideoSchema.safeParse({ ...base, durationSeconds: 181 })
        .success,
    ).toBe(false)
  })

  it('rechaza bytes por encima de 100 MB', () => {
    expect(
      addCaseCarouselVideoSchema.safeParse({
        ...base,
        bytes: 100 * 1024 * 1024 + 1,
      }).success,
    ).toBe(false)
  })
})

describe('addCaseCarouselImageSchema / addCaseCarouselVideoSchema — carrusel de caso, sin tope (§3, §6)', () => {
  it('acepta una imagen válida con sortOrder y alt', () => {
    const result = addCaseCarouselImageSchema.safeParse({
      contentId: CONTENT_ID,
      cloudinaryPublicId: 'greener/content/abc123',
      format: 'webp',
      width: 1200,
      height: 800,
      bytes: 500_000,
      sortOrder: 3,
      alt: 'Equipo de Agróptimum en el campo',
    })

    expect(result.success).toBe(true)
  })

  it('rechaza sortOrder negativo', () => {
    const result = addCaseCarouselImageSchema.safeParse({
      contentId: CONTENT_ID,
      cloudinaryPublicId: 'greener/content/abc123',
      format: 'webp',
      width: 1200,
      height: 800,
      bytes: 500_000,
      sortOrder: -1,
      alt: 'Equipo de Agróptimum en el campo',
    })

    expect(result.success).toBe(false)
  })

  it('rechaza alt vacío — hueco de accesibilidad cerrado el 14 sep (case_detail_media no lo tenía)', () => {
    const result = addCaseCarouselImageSchema.safeParse({
      contentId: CONTENT_ID,
      cloudinaryPublicId: 'greener/content/abc123',
      format: 'webp',
      width: 1200,
      height: 800,
      bytes: 500_000,
      sortOrder: 0,
      alt: '   ',
    })

    expect(result.success).toBe(false)
  })

  it('acepta un vídeo válido dentro de los límites de caso (100 MB / 180 s)', () => {
    const result = addCaseCarouselVideoSchema.safeParse({
      contentId: CONTENT_ID,
      cloudinaryPublicId: 'greener/content/videos/abc123',
      format: 'mp4',
      width: 1920,
      height: 1080,
      durationSeconds: 60,
      bytes: 20 * 1024 * 1024,
      sortOrder: 0,
      alt: 'Vídeo del equipo de Agróptimum',
    })

    expect(result.success).toBe(true)
  })

  it('rechaza un vídeo por encima de 180 s', () => {
    const result = addCaseCarouselVideoSchema.safeParse({
      contentId: CONTENT_ID,
      cloudinaryPublicId: 'greener/content/videos/abc123',
      format: 'mp4',
      width: 1920,
      height: 1080,
      durationSeconds: 181,
      bytes: 20 * 1024 * 1024,
      sortOrder: 0,
      alt: 'Vídeo del equipo de Agróptimum',
    })

    expect(result.success).toBe(false)
  })

  it('rechaza un vídeo sin alt', () => {
    const result = addCaseCarouselVideoSchema.safeParse({
      contentId: CONTENT_ID,
      cloudinaryPublicId: 'greener/content/videos/abc123',
      format: 'mp4',
      width: 1920,
      height: 1080,
      durationSeconds: 60,
      bytes: 20 * 1024 * 1024,
      sortOrder: 0,
      alt: '',
    })

    expect(result.success).toBe(false)
  })
})

describe('removeCaseCarouselMediaSchema', () => {
  it('acepta una entrada válida', () => {
    const result = removeCaseCarouselMediaSchema.safeParse({
      contentId: CONTENT_ID,
      mediaId: MEDIA_ID,
      cloudinaryPublicId: 'greener/content/abc123',
      kind: 'image',
    })

    expect(result.success).toBe(true)
  })

  it('rechaza un kind que no sea image ni video', () => {
    const result = removeCaseCarouselMediaSchema.safeParse({
      contentId: CONTENT_ID,
      mediaId: MEDIA_ID,
      cloudinaryPublicId: 'greener/content/abc123',
      kind: 'audio',
    })

    expect(result.success).toBe(false)
  })
})
