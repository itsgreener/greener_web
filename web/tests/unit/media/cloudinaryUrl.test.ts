import { describe, it, expect } from 'vitest'
import {
  buildImageUrl,
  buildImageSrcSet,
  buildVideoPosterUrl,
  buildVideoPosterSrcSet,
  buildVideoSources,
  buildFeedVideoSources,
} from '@/modules/media/infrastructure/cloudinaryUrl'
import {
  IMAGE_DELIVERY,
  pickDetailWidth,
} from '@/modules/media/domain/mediaDelivery'

// NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud" viene de tests/setup.ts.
// Las cadenas EXACTAS del contrato las fija mediaContract.test.ts; aquí se
// comprueba el comportamiento general de los constructores.
const PUBLIC_ID = 'greener/content/abc123'

describe('buildImageUrl', () => {
  it('usa la calidad del contexto (feed: q_auto:eco), f_auto y el mayor escalón cuando no se pasa width', () => {
    const url = buildImageUrl(PUBLIC_ID, 'feed')

    expect(url).toBe(
      `https://res.cloudinary.com/test-cloud/image/upload/q_auto:eco,f_auto,w_640,c_limit/${PUBLIC_ID}`,
    )
  })

  it('usa el ancho explícito cuando se pasa', () => {
    const url = buildImageUrl(PUBLIC_ID, 'feed', 320)

    expect(url).toContain('w_320')
  })

  it("el contexto 'detail' permite anchos mayores que 'feed' (política: el feed nunca sirve el original)", () => {
    const feedUrl = buildImageUrl(PUBLIC_ID, 'feed')
    const detailUrl = buildImageUrl(PUBLIC_ID, 'detail')

    expect(feedUrl).toContain('w_640')
    expect(feedUrl).not.toContain('w_960')
    expect(detailUrl).toContain('w_1920')
  })
})

describe('buildImageSrcSet', () => {
  it('genera una entrada por cada ancho configurado para el contexto, en orden', () => {
    const srcset = buildImageSrcSet(PUBLIC_ID, 'feed')
    const entries = srcset.split(', ')

    expect(entries).toHaveLength(3) // escalera 320/480/640 — contrato §4.2
    expect(entries[0]).toContain('320w')
    expect(entries[entries.length - 1]).toContain('640w')
  })
})

describe('buildVideoPosterUrl', () => {
  it('construye una URL .jpg bajo el recurso video (no image) — poster de vídeo', () => {
    const url = buildVideoPosterUrl(PUBLIC_ID, { width: 480 }, 'feed')

    expect(url).toBe(
      `https://res.cloudinary.com/test-cloud/video/upload/q_auto:eco,f_jpg,w_480,c_limit/${PUBLIC_ID}.jpg`,
    )
  })

  it('con alto (póster de la ficha) acota ancho Y alto', () => {
    expect(
      buildVideoPosterUrl(PUBLIC_ID, { width: 1280, height: 720 }, 'detail'),
    ).toContain('w_1280,h_720,c_limit')
  })

  it('el srcset del póster del feed usa la misma escalera que las imágenes', () => {
    const entries = buildVideoPosterSrcSet(PUBLIC_ID).split(', ')

    expect(entries.map((e) => e.split(' ')[1])).toEqual(
      IMAGE_DELIVERY.feed.widths.map((w) => `${w}w`),
    )
  })
})

describe('buildVideoSources', () => {
  it('devuelve dos fuentes explícitas, WebM primero y MP4 de reserva, bajo el recurso video', () => {
    const sources = buildVideoSources(PUBLIC_ID, 'toolDetail', {
      width: 1280,
      height: 720,
    })

    expect(sources).toHaveLength(2)
    expect(sources[0].type).toContain('video/webm')
    expect(sources[1].type).toBe('video/mp4')
    for (const { src } of sources) {
      expect(src).toContain('/video/upload/')
      expect(src).toMatch(new RegExp(`/${PUBLIC_ID}\\.(webm|mp4)$`))
    }
  })

  it('cada fuente lleva la extensión de su formato (.webm / .mp4): sin ella Cloudinary la trata como OTRA derivada y la regenera', () => {
    const [webm, mp4] = buildVideoSources(PUBLIC_ID, 'toolDetail', {
      width: 856,
      height: 1070,
    })

    expect(webm.src.endsWith(`/${PUBLIC_ID}.webm`)).toBe(true)
    expect(mp4.src.endsWith(`/${PUBLIC_ID}.mp4`)).toBe(true)
  })

  it('el vídeo del feed pide un solo ancho de 480', () => {
    for (const { src } of buildFeedVideoSources(PUBLIC_ID)) {
      expect(src).toContain('c_limit,w_480')
    }
  })
})

describe('pickDetailWidth', () => {
  it('reutiliza los anchos de detalle de las imágenes, sin constantes nuevas', () => {
    const widths = IMAGE_DELIVERY.detail.widths

    for (const css of [100, 480, 481, 800, 1500, 5000]) {
      for (const dpr of [1, 1.5, 2, 3]) {
        expect(widths).toContain(pickDetailWidth(css, dpr) as never)
      }
    }
  })

  it('elige el menor ancho que cubre la caja a la densidad del dispositivo', () => {
    expect(pickDetailWidth(400, 1)).toBe(960)
    expect(pickDetailWidth(480, 1)).toBe(960)
    expect(pickDetailWidth(481, 2)).toBe(1440)
    expect(pickDetailWidth(800, 2)).toBe(1920)
  })

  it('limita la densidad a 2: un DPR 3 no pide más que un DPR 2', () => {
    expect(pickDetailWidth(480, 3)).toBe(pickDetailWidth(480, 2))
  })

  it('con una caja mayor que el mayor ancho, usa el mayor; sin caja, el menor', () => {
    expect(pickDetailWidth(5000, 2)).toBe(1920)
    expect(pickDetailWidth(0, 1)).toBe(960)
    expect(pickDetailWidth(-10, 1)).toBe(960)
  })
})
