import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // El destino actual es Vercel, que hace su propio empaquetado y donde `standalone` es inocuo.
  // `standalone` se conserva porque es el plan B en Dinahosting con PM2
  // (arquitectura §19.1, ADR-12; `despliegue.md`): `next build` genera
  // `.next/standalone` con un `server.js` que se ejecuta sin `node_modules` ni
  // `next start`, y ese servidor NO copia `public/` ni `.next/static/`, hay que
  // copiarlos a mano tras el build. Al cerrar la migración (`PROGRESO.md` §4.0)
  // se decide si se quita.
  output: 'standalone',
  typescript: {
    // La build solo comprueba tipos de `src/`: los tests y los E2E se comprueban
    // en `npm run typecheck` (tsconfig.json), no hace falta repetirlo al compilar
    // para producción ni que dependa de vitest o de Playwright.
    tsconfigPath: 'tsconfig.build.json',
  },
  images: {
    // El optimizador `/_next/image` está APAGADO a propósito (RES-A1): la web
    // no importa `next/image` en ningún sitio. Las imágenes ya llegan
    // transformadas desde la CDN de medios (`modules/media/client/
    // cloudinaryUrl.ts`: perfil, ancho y `srcset` en la propia URL), y un
    // segundo optimizador las retransformaría. Con `remotePatterns` abierto a
    // un dominio, cualquier visitante anónimo podía pedir al servidor que
    // descargara y reescalara imágenes de cualquier cuenta de ese dominio, con
    // el coste de CPU, red y (en Vercel) cuota de optimización que eso trae.
    // Un test (nextImages.test.ts) falla si alguien lo vuelve a abrir.
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      // Por defecto 1 MB. Tiene que ser IGUAL O MAYOR que
      // PACKAGE_LIMITS.maxZipSizeBytes (3,5 MB): el cuerpo lleva el archivo más
      // los campos del formulario. Ni el ZIP de tool/insight (packageActions.ts)
      // ni los CV del personal (talent, hasta 10 MB: `prepareStaffCvUpload`)
      // viajan ya por una Server Action: suben directo a Storage con una URL
      // firmada, por lo que no hace falta ningún margen grande y cuanto más
      // bajo es el tope, menos cuerpo puede obligar a Next a leer y copiar un
      // POST anónimo (SEC-X-2). 5 MB es también más o menos lo que admite
      // Vercel (4,5 MB) en cualquier caso. Un test (packageSizeLimits.test.ts)
      // falla si baja de 3,5 MB.
      bodySizeLimit: '5mb',
    },
    // OJO, no es opcional: como existe `src/proxy.ts` y su matcher cubre los
    // POST de las Server Actions, Next COPIA en memoria el cuerpo de cada
    // petición que no sea GET, con un tope de 10 MiB por defecto — y por
    // encima de ese tope NO rechaza: trunca en silencio y deja seguir con un
    // cuerpo cortado (documentado en `proxyClientMaxBodySize`; probado aquí el
    // 28 sep: un cuerpo de 12 MB llegaba a 10 MB y fallaba con «no es JSON
    // válido»). Tiene que ser IGUAL O MAYOR que `bodySizeLimit`; el margen es
    // para la cabecera multipart del formulario. Un test lo comprueba.
    proxyClientMaxBodySize: '6mb',
  },
}

export default nextConfig
