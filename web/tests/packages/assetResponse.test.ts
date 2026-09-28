import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  contentTypeFor,
} from '@/modules/packages/infrastructure/assetResponse'

describe(
  'assetResponse',
  () => {
    it(
      'sirve WOFF2 con su MIME correcto',
      () => {
        expect(
          contentTypeFor(
            'coolvetica.woff2',
          ),
        ).toBe(
          'font/woff2',
        )
      },
    )

    it(
      'normaliza la extensión a minúsculas',
      () => {
        expect(
          contentTypeFor(
            'COOLVETICA.WOFF2',
          ),
        ).toBe(
          'font/woff2',
        )
      },
    )

    it(
      'mantiene los MIME de CSS y JavaScript',
      () => {
        expect(
          contentTypeFor(
            'style.css',
          ),
        ).toBe(
          'text/css; charset=utf-8',
        )

        expect(
          contentTypeFor(
            'app.js',
          ),
        ).toBe(
          'text/javascript; charset=utf-8',
        )
      },
    )

    it(
      'sirve imágenes conocidas con su MIME',
      () => {
        expect(
          contentTypeFor(
            'image.png',
          ),
        ).toBe(
          'image/png',
        )

        expect(
          contentTypeFor(
            'image.webp',
          ),
        ).toBe(
          'image/webp',
        )

        expect(
          contentTypeFor(
            'image.jpg',
          ),
        ).toBe(
          'image/jpeg',
        )
      },
    )

    it(
      'usa octet-stream para formatos desconocidos',
      () => {
        expect(
          contentTypeFor(
            'archivo.bin',
          ),
        ).toBe(
          'application/octet-stream',
        )
      },
    )
  },
)