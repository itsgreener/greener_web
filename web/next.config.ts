import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Despliegue en Dinahosting con PM2 + un cron de vigilancia; el proxy inverso
  // (Nginx) lo gestiona Dinahosting y no es configurable por nosotros
  // (arquitectura §19.1, ADR-12). `next build` genera `.next/standalone` con
  // un `server.js` que se ejecuta sin `node_modules` ni `next start`. Ese
  // servidor NO copia `public/` ni `.next/static/` — hay que copiarlos a mano
  // tras el build. Pasos exactos y verificados en `despliegue.md`.
  output: 'standalone',
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
      // Por defecto 1 MB — insuficiente para subir un CV (un archivo por
      // petición, máximo 3,5 MB, talentConstants.ts). Tiene que ser IGUAL O
      // MAYOR que ese máximo (y que PACKAGE_LIMITS.maxZipSizeBytes, el mismo
      // 3,5 MB): el cuerpo lleva el archivo más los campos del formulario.
      // El ZIP de tool/insight ya NO viaja por una Server Action (va directo
      // a Storage, packageActions.ts), así que no hace falta el margen de
      // 20 MB de antes: cuanto más bajo es el tope, menos cuerpo puede
      // obligar a Next a leer y copiar un POST anónimo (SEC-X-2). 5 MB es
      // también más o menos lo que admite Vercel (4,5 MB) en cualquier caso.
      // Un test (packageSizeLimits.test.ts) falla si baja de 3,5 MB.
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
