import { describe, it, expect } from 'vitest'
import {
  buildImageUrl,
  buildImageSrcSet,
  buildVideoPosterUrl,
  buildVideoPreviewUrl,
  buildVideoFullUrl,
} from '@/modules/media/infrastructure/cloudinaryUrl'

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
