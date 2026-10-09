import { describe, it, expect } from 'vitest'
import {
  buildFeedVideoSources,
  buildImageSrcSet,
  buildImageUrl,
  buildVideoPosterSrcSet,
  buildVideoPosterUrl,
  buildVideoSources,
  buildVideoTransformations,
} from '@/modules/media/infrastructure/cloudinaryUrl'
import {
  ADMIN_THUMBNAIL_WIDTH,
  DETAIL_VIDEO_RUNGS,
  IMAGE_DELIVERY,
  VIDEO_PROFILES,
  type VideoProfile,
} from '@/modules/media/domain/mediaDelivery'

/**
 * CONTRATO DE ENTREGA CONGELADO (contrato-medios-fase-1.md §4, 7 oct 2026).
 *
 * Estas son las cadenas EXACTAS que se piden a Cloudinary. Cada cadena
 * distinta es una versión única que se cuenta una vez (transformaciones) y
 * deja una copia ocupando almacenamiento (Free: 25 créditos). Por eso este
 * test NO se ajusta «para que pase»: si falla, alguien ha cambiado una URL
 * y eso regenera versiones. Cambiar el contrato es una decisión de
 * Greener, se hace de golpe y se documenta (§4.7).
 *
 * NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud" viene de tests/setup.ts.
 */
const ID = 'greener/content/videos/demo'
const BASE_IMAGE = 'https://res.cloudinary.com/test-cloud/image/upload'
const BASE_VIDEO = 'https://res.cloudinary.com/test-cloud/video/upload'

describe('contrato congelado — imágenes del feed', () => {
  it('escalera 320/480/640 con q_auto:eco,f_auto y c_limit (tope 640, sin 960)', () => {
    expect(buildImageSrcSet(ID, 'feed')).toBe(
      [
        `${BASE_IMAGE}/q_auto:eco,f_auto,w_320,c_limit/${ID} 320w`,
        `${BASE_IMAGE}/q_auto:eco,f_auto,w_480,c_limit/${ID} 480w`,
        `${BASE_IMAGE}/q_auto:eco,f_auto,w_640,c_limit/${ID} 640w`,
      ].join(', '),
    )
  })

  it('sin ancho explícito, el feed usa el mayor escalón (640)', () => {
    expect(buildImageUrl(ID, 'feed')).toBe(
      `${BASE_IMAGE}/q_auto:eco,f_auto,w_640,c_limit/${ID}`,
    )
  })

  it('las miniaturas del ABM reutilizan el escalón 320: ninguna versión suelta', () => {
    expect(ADMIN_THUMBNAIL_WIDTH).toBe(320)
    expect(IMAGE_DELIVERY.feed.widths).toContain(ADMIN_THUMBNAIL_WIDTH)
  })
})

describe('contrato congelado — imágenes de detalle (sin cambios)', () => {
  it('portada de ficha y carrusel de caso: 960/1440/1920 con q_auto,f_auto', () => {
    expect(buildImageSrcSet(ID, 'detail')).toBe(
      [
        `${BASE_IMAGE}/q_auto,f_auto,w_960,c_limit/${ID} 960w`,
        `${BASE_IMAGE}/q_auto,f_auto,w_1440,c_limit/${ID} 1440w`,
        `${BASE_IMAGE}/q_auto,f_auto,w_1920,c_limit/${ID} 1920w`,
      ].join(', '),
    )
  })

  it('imagen OG: 1200 fijo (sin cambios)', () => {
    expect(buildImageUrl(ID, 'detail', 1200)).toBe(
      `${BASE_IMAGE}/q_auto,f_auto,w_1200,c_limit/${ID}`,
    )
  })
})

describe('contrato congelado — póster de vídeo', () => {
  it('feed: srcset 320/480/640, JPG, q_auto:eco', () => {
    expect(buildVideoPosterSrcSet(ID)).toBe(
      [
        `${BASE_VIDEO}/q_auto:eco,f_jpg,w_320,c_limit/${ID}.jpg 320w`,
        `${BASE_VIDEO}/q_auto:eco,f_jpg,w_480,c_limit/${ID}.jpg 480w`,
        `${BASE_VIDEO}/q_auto:eco,f_jpg,w_640,c_limit/${ID}.jpg 640w`,
      ].join(', '),
    )
  })

  it('ficha: JPG con el tamaño (ancho y alto) del escalón del vídeo', () => {
    expect(
      buildVideoPosterUrl(ID, { width: 1280, height: 720 }, 'detail'),
    ).toBe(`${BASE_VIDEO}/q_auto,f_jpg,w_1280,h_720,c_limit/${ID}.jpg`)
  })
})

describe('contrato congelado — vídeo del feed (pines de tool)', () => {
  it('un solo ancho (480), sin audio, WebM/VP9 primero y MP4/H.264 de reserva, sin f_auto', () => {
    expect(buildFeedVideoSources(ID)).toEqual([
      {
        src: `${BASE_VIDEO}/ac_none/c_limit,w_480/f_webm,vc_vp9/q_auto:eco/${ID}.webm`,
        type: 'video/webm; codecs="vp9"',
      },
      {
        src: `${BASE_VIDEO}/ac_none/c_limit,w_480/f_mp4,vc_h264/q_auto:eco/${ID}.mp4`,
        type: 'video/mp4',
      },
    ])
  })
})

describe('contrato congelado — vídeo de la ficha de tool (escalones M y L)', () => {
  it('M en 16:9 = 1280×720, sin audio', () => {
    expect(
      buildVideoSources(ID, 'toolDetail', DETAIL_VIDEO_RUNGS['16:9'].M).map(
        (s) => s.src,
      ),
    ).toEqual([
      `${BASE_VIDEO}/ac_none/c_limit,w_1280,h_720/f_webm,vc_vp9/q_auto/${ID}.webm`,
      `${BASE_VIDEO}/ac_none/c_limit,w_1280,h_720/f_mp4,vc_h264/q_auto/${ID}.mp4`,
    ])
  })

  it('L en 16:9 = 1600×900, sin audio', () => {
    expect(
      buildVideoSources(ID, 'toolDetail', DETAIL_VIDEO_RUNGS['16:9'].L).map(
        (s) => s.src,
      ),
    ).toEqual([
      `${BASE_VIDEO}/ac_none/c_limit,w_1600,h_900/f_webm,vc_vp9/q_auto/${ID}.webm`,
      `${BASE_VIDEO}/ac_none/c_limit,w_1600,h_900/f_mp4,vc_h264/q_auto/${ID}.mp4`,
    ])
  })

  it('M en 9:16 = 720×1280: el tope es por ÁREA, no por ancho', () => {
    expect(
      buildVideoSources(ID, 'toolDetail', DETAIL_VIDEO_RUNGS['9:16'].M)[0].src,
    ).toBe(
      `${BASE_VIDEO}/ac_none/c_limit,w_720,h_1280/f_webm,vc_vp9/q_auto/${ID}.webm`,
    )
  })
})

describe('contrato congelado — vídeo de caso y de contenido libre', () => {
  it('escalón M, MISMA cadena que la ficha pero CONSERVANDO el audio (sin ac_none)', () => {
    expect(
      buildVideoSources(ID, 'caseDetail', DETAIL_VIDEO_RUNGS['16:9'].M),
    ).toEqual([
      {
        src: `${BASE_VIDEO}/c_limit,w_1280,h_720/f_webm,vc_vp9/q_auto/${ID}.webm`,
        type: 'video/webm; codecs="vp9"',
      },
      {
        src: `${BASE_VIDEO}/c_limit,w_1280,h_720/f_mp4,vc_h264/q_auto/${ID}.mp4`,
        type: 'video/mp4',
      },
    ])
  })
})

describe('contrato — propiedades que no se pueden romper', () => {
  const profiles: VideoProfile[] = ['feed', 'toolDetail', 'caseDetail']
  const sizes = [
    { width: 480 },
    ...Object.values(DETAIL_VIDEO_RUNGS).flatMap((r) => [r.M, r.L]),
  ]

  it('NUNCA f_auto en vídeo, SIEMPRE c_limit con tamaño y dos formatos explícitos', () => {
    for (const profile of profiles) {
      for (const size of sizes) {
        const sources = buildVideoSources(ID, profile, size)

        expect(sources).toHaveLength(2)
        for (const { src } of sources) {
          expect(src).not.toContain('f_auto')
          expect(src).toMatch(/c_limit,w_\d+/)
        }
        expect(sources[0].src).toContain('f_webm,vc_vp9')
        expect(sources[1].src).toContain('f_mp4,vc_h264')
      }
    }
  })

  it('el audio se quita SOLO en feed y ficha de tool; el caso lo conserva', () => {
    expect(VIDEO_PROFILES.feed.audio).toBe(false)
    expect(VIDEO_PROFILES.toolDetail.audio).toBe(false)
    expect(VIDEO_PROFILES.caseDetail.audio).toBe(true)

    for (const profile of profiles) {
      const hasAcNone = buildVideoSources(ID, profile, {
        width: 480,
      })[0].src.includes('ac_none')

      expect(hasAcNone).toBe(!VIDEO_PROFILES[profile].audio)
    }
  })

  it('no se usa fps: no hay sintaxis de «tope» (fps_<mín>-<máx> es un rango con mínimo obligatorio)', () => {
    for (const profile of profiles) {
      for (const { src } of buildVideoSources(ID, profile, { width: 480 })) {
        expect(src).not.toMatch(/fps_/)
      }
    }
  })

  it('ninguna imagen del feed pide un ancho fuera de la escalera', () => {
    const widths = [...buildImageSrcSet(ID, 'feed').matchAll(/w_(\d+)/g)].map(
      (m) => Number(m[1]),
    )

    expect(
      widths.every((w) => IMAGE_DELIVERY.feed.widths.includes(w as never)),
    ).toBe(true)
  })

  it('una sola fuente de verdad: las cadenas del eager (fase 2) son EXACTAMENTE las de entrega', () => {
    for (const profile of profiles) {
      for (const size of sizes) {
        const fromDelivery = buildVideoSources(ID, profile, size).map((s) =>
          s.src
            .replace(/\.(webm|mp4)$/, '')
            .slice(`${BASE_VIDEO}/`.length, -`/${ID}`.length),
        )

        expect(buildVideoTransformations(profile, size)).toEqual(fromDelivery)
      }
    }
  })
})

describe('contrato congelado — calidad por contexto (decisión del 7 oct)', () => {
  it('el feed entero va en q_auto:eco: imagen, póster y vídeo', () => {
    const feedUrls = [
      buildImageUrl(ID, 'feed', 320),
      ...buildImageSrcSet(ID, 'feed').split(', '),
      ...buildVideoPosterSrcSet(ID).split(', '),
      ...buildFeedVideoSources(ID).map((v) => v.src),
    ]

    for (const url of feedUrls) {
      expect(url).toContain('q_auto:eco')
    }
  })

  it('las fichas (imagen, póster y vídeo de tool y de caso) van en q_auto, sin eco', () => {
    const detailUrls = [
      buildImageUrl(ID, 'detail', 960),
      ...buildImageSrcSet(ID, 'detail').split(', '),
      buildVideoPosterUrl(ID, { width: 1280, height: 720 }, 'detail'),
      ...buildVideoSources(ID, 'toolDetail', { width: 1280, height: 720 }).map(
        (v) => v.src,
      ),
      ...buildVideoSources(ID, 'caseDetail', { width: 1280, height: 720 }).map(
        (v) => v.src,
      ),
    ]

    for (const url of detailUrls) {
      expect(url).toContain('q_auto')
      expect(url).not.toContain('eco')
    }
  })

  it('las miniaturas del ABM comparten versión con el escalón de 320 del feed (eco, sin versiones propias)', () => {
    expect(buildImageUrl(ID, 'feed', ADMIN_THUMBNAIL_WIDTH)).toBe(
      `${BASE_IMAGE}/q_auto:eco,f_auto,w_320,c_limit/${ID}`,
    )
    expect(buildImageSrcSet(ID, 'feed').split(', ')[0]).toBe(
      `${buildImageUrl(ID, 'feed', ADMIN_THUMBNAIL_WIDTH)} 320w`,
    )
  })
})
