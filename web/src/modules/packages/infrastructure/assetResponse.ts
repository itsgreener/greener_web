import { NextResponse } from 'next/server'

import { ASSET_CACHE_CONTROL } from '../domain/assetCaching'
import type { StoragePackageAsset } from './supabaseStorageSource'

// Tipos con Content-Type propio. Todo lo demás sale como
// application/octet-stream (ver contrato-zip-tools-insights.md §1).
//
// Ampliado el 29 de septiembre: los paquetes de insights reales llegaron
// con tipografía propia en WOFF2 (Coolvetica) e imágenes JPEG/WebP, que
// hasta entonces salían como octet-stream — una fuente así no se aplica
// (el navegador la descarta) y una imagen así puede no reconocerse, según
// el navegador. contrato-zip-tools-insights.md §1 queda desactualizado en
// este punto (sigue diciendo "solo js/css/json/png/svg"); actualizar ahí
// también.
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
 * El Content-Type correcto es imprescindible: un worker.js servido con
 * MIME incorrecto no arranca en la mayoría de navegadores, y una fuente
 * WOFF2 servida como octet-stream no se aplica.
 *
 * La extensión se normaliza a minúsculas: un `Coolvetica.WOFF2` subido
 * así (frecuente si el fichero viene de una exportación de diseño) debe
 * comportarse igual que `coolvetica.woff2`.
 */
export function contentTypeFor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return CONTENT_TYPES[ext] ?? 'application/octet-stream'
}

/**
 * Respuesta común de las dos rutas de assets (tools e insights): 304 sin
 * cuerpo si el navegador ya tiene esta versión, 200 con el archivo si no.
 * En ambos casos lleva ETag y `Cache-Control: no-cache` (revalidar).
 */
export function buildAssetResponse(
  asset: StoragePackageAsset,
  filename: string,
): NextResponse {
  const headers = {
    ETag: asset.etag,
    'Cache-Control': ASSET_CACHE_CONTROL,
  }

  if (asset.notModified) {
    return new NextResponse(null, { status: 304, headers })
  }

  return new NextResponse(new Uint8Array(asset.data), {
    status: 200,
    headers: {
      ...headers,
      'Content-Type': contentTypeFor(filename),
    },
  })
}
