import { describe, it, expect } from 'vitest'
import {
  buildImageUrl,
  buildImageSrcSet,
  buildVideoPosterUrl,
  buildVideoPreviewUrl,
  buildVideoFullUrl,
  buildVideoDetailUrl,
} from '@/modules/media/infrastructure/cloudinaryUrl'
import {
  IMAGE_DELIVERY,
  pickDetailWidth,
} from '@/modules/media/domain/mediaDelivery'

// NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud" viene de tests/setup.ts
const PUBLIC_ID = 'greener/content/abc123'

describe('buildImageUrl', () => {
  it('usa q_auto/f_auto y el ancho más grande del contexto cuando no se pasa width', () => {
    const url = buildImageUrl(PUBLIC_ID, 'feed')

    expect(url).toBe(
      `https://res.cloudinary.com/test-cloud/image/upload/q_auto,f_auto,w_960,c_limit/${PUBLIC_ID}`,
    )
  })

  it('usa el ancho explícito cuando se pasa', () => {
    const url = buildImageUrl(PUBLIC_ID, 'feed', 320)

    expect(url).toContain('w_320')
  })

  it("el contexto 'detail' permite anchos mayores que 'feed' (política: el feed nunca sirve el original)", () => {
    const feedUrl = buildImageUrl(PUBLIC_ID, 'feed')
    const detailUrl = buildImageUrl(PUBLIC_ID, 'detail')

    expect(feedUrl).toContain('w_960')
    expect(detailUrl).toContain('w_1920')
  })
})

describe('buildImageSrcSet', () => {
  it('genera una entrada por cada ancho configurado para el contexto, en orden', () => {
    const srcset = buildImageSrcSet(PUBLIC_ID, 'feed')
    const entries = srcset.split(', ')

    expect(entries).toHaveLength(4) // [320, 480, 640, 960] — §10.1
    expect(entries[0]).toContain('320w')
    expect(entries[entries.length - 1]).toContain('960w')
  })
})

describe('buildVideoPosterUrl', () => {
  it('construye una URL .jpg bajo el recurso video (no image) — poster de vídeo', () => {
    const url = buildVideoPosterUrl(PUBLIC_ID)

    expect(url).toBe(
      `https://res.cloudinary.com/test-cloud/video/upload/q_auto,f_jpg,w_960,c_limit/${PUBLIC_ID}.jpg`,
    )
  })
})

describe('buildVideoPreviewUrl', () => {
  it('limita la duración del preview a 5 s (feed nunca sirve el vídeo completo)', () => {
    const url = buildVideoPreviewUrl(PUBLIC_ID)

    expect(url).toContain('du_5')
    expect(url).not.toContain('w_') // el preview no recorta ancho, solo duración
  })
})

describe('buildVideoFullUrl', () => {
  it('no aplica límite de duración ni de ancho — solo para detalle/reproducción explícita', () => {
    const url = buildVideoFullUrl(PUBLIC_ID)

    expect(url).toBe(
      `https://res.cloudinary.com/test-cloud/video/upload/q_auto,f_auto/${PUBLIC_ID}`,
    )
  })
})

describe('vídeo de la ficha de una tool (5 oct 2026)', () => {
  it('buildVideoDetailUrl limita el ancho (c_limit) y deja que f_auto elija WebM o MP4', () => {
    expect(buildVideoDetailUrl(PUBLIC_ID, 960)).toBe(
      `https://res.cloudinary.com/test-cloud/video/upload/q_auto,f_auto,w_960,c_limit/${PUBLIC_ID}`,
    )
  })

  it('pickDetailWidth reutiliza los anchos de detalle de las imágenes, sin constantes nuevas', () => {
    const widths = IMAGE_DELIVERY.detail.widths

    for (const css of [100, 480, 700, 1000, 3000]) {
      for (const dpr of [1, 2, 3]) {
        expect(widths).toContain(pickDetailWidth(css, dpr))
      }
    }
  })

  it('elige el menor ancho que cubre la caja a la densidad del dispositivo', () => {
    expect(pickDetailWidth(400, 1)).toBe(960)
    expect(pickDetailWidth(480, 1)).toBe(960)
    expect(pickDetailWidth(481, 2)).toBe(1440)
    expect(pickDetailWidth(800, 2)).toBe(1920)
  })

  it('con densidad 3× no pasa de 2× (en vídeo cuesta ancho de banda y no se nota)', () => {
    expect(pickDetailWidth(480, 3)).toBe(pickDetailWidth(480, 2))
  })

  it('una caja mayor que el mayor ancho usa el mayor, y una caja 0 o negativa el menor', () => {
    expect(pickDetailWidth(5000, 2)).toBe(1920)
    expect(pickDetailWidth(0, 1)).toBe(960)
    expect(pickDetailWidth(-10, 1)).toBe(960)
  })
})
