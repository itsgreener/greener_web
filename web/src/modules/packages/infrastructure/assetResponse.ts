import { NextResponse } from 'next/server'

import { ASSET_CACHE_CONTROL } from '../domain/assetCaching'
import type { StoragePackageAsset } from './supabaseStorageSource'

/**
 * Tipos MIME conocidos para los assets permitidos dentro de los paquetes
 * HTML de Tools e Insights.
 *
 * Los paquetes actuales de Insights incluyen Coolvetica en formato WOFF2,
 * por lo que debe servirse como font/woff2 y no como octet-stream.
 *
 * Todo formato desconocido mantiene el fallback seguro
 * application/octet-stream.
 */
const CONTENT_TYPES: Record<string, string> = {
  js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',

  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',

  woff: 'font/woff',
  woff2: 'font/woff2',
}

/**
 * Devuelve el Content-Type correspondiente a un asset del paquete.
 *
 * La extensión se normaliza a minúsculas para que, por ejemplo,
 * FONT.WOFF2 y font.woff2 tengan el mismo comportamiento.
 */
export function contentTypeFor(
  filename: string,
): string {
  const ext =
    filename
      .split('.')
      .pop()
      ?.toLowerCase() ??
    ''

  return (
    CONTENT_TYPES[ext] ??
    'application/octet-stream'
  )
}

/**
 * Respuesta común de las rutas de assets de Tools e Insights.
 *
 * - 304 sin cuerpo cuando coincide el ETag.
 * - 200 con el archivo cuando debe servirse.
 * - Cache-Control: no-cache obliga a revalidar.
 *
 * No usamos immutable porque la URL pública del asset no contiene el
 * número de versión del paquete.
 */
export function buildAssetResponse(
  asset: StoragePackageAsset,
  filename: string,
): NextResponse {
  const headers = {
    ETag: asset.etag,
    'Cache-Control':
      ASSET_CACHE_CONTROL,
  }

  if (asset.notModified) {
    return new NextResponse(
      null,
      {
        status: 304,
        headers,
      },
    )
  }

  return new NextResponse(
    new Uint8Array(
      asset.data,
    ),
    {
      status: 200,

      headers: {
        ...headers,

        'Content-Type':
          contentTypeFor(
            filename,
          ),
      },
    },
  )
}