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
      // Por defecto 1 MB — insuficiente para un ZIP de tool/insight. 20 MB
      // coincide con PACKAGE_LIMITS.maxZipSizeBytes (modules/packages/domain/
      // packageLimits.ts); si esa cifra cambia, cambiar también aquí.
      bodySizeLimit: '20mb',
    },
  },
}

export default nextConfig
