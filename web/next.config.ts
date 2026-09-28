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
    // Permite optimizar con next/image las imágenes servidas desde Cloudinary
    // (arquitectura §5, §9.2 — Cloudinary es la fuente de originales/derivadas).
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      // Por defecto 1 MB — insuficiente para un ZIP de tool/insight. Tiene
      // que ser IGUAL O MAYOR que PACKAGE_LIMITS.maxZipSizeBytes (10 MB,
      // modules/packages/domain/packageLimits.ts): el cuerpo lleva el ZIP
      // más los campos del formulario. Es más grande a propósito, para que
      // un ZIP de 10-20 MB llegue al validador y reciba el mensaje claro
      // "supera el límite de 10 MB" en vez del error genérico de Next.
      // Un test (packageSizeLimits.test.ts) falla si baja de aquí.
      bodySizeLimit: '20mb',
    },
    // OJO, no es opcional: como existe `src/proxy.ts` y su matcher cubre los
    // POST de las Server Actions, Next COPIA en memoria el cuerpo de cada
    // petición que no sea GET, con un tope de 10 MiB por defecto — y por
    // encima de ese tope NO rechaza: trunca en silencio y deja seguir con un
    // cuerpo cortado (documentado en `proxyClientMaxBodySize`; probado aquí el
    // 28 sep: un cuerpo de 12 MB llegaba a 10 MB y fallaba con «no es JSON
    // válido»). Sin esto, el `bodySizeLimit` de arriba nunca llegaría a
    // aplicarse a un ZIP de 10-20 MB. Tiene que ser IGUAL O MAYOR que
    // `bodySizeLimit`; el margen es para la cabecera multipart del
    // formulario. Un test lo comprueba.
    proxyClientMaxBodySize: '25mb',
  },
}

export default nextConfig
