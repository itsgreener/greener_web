import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Permite optimizar con next/image las imágenes servidas desde Cloudinary
    // (arquitectura §5, §9.2 — Cloudinary es la fuente de originales/derivadas).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
