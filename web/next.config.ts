import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
  },
}

export default nextConfig
