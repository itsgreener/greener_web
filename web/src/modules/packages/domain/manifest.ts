/**
 * Tipos del contrato de paquete HTML de tools/insights (arquitectura §12.2).
 * Puro: no depende de dónde vive físicamente el paquete (disco local en
 * este spike, Supabase Storage en producción — arquitectura §5, §12.2).
 */

/**
 * Metadatos de compartición y SEO del paquete (contrato del ZIP §2.1). Los
 * escribe el autor dentro del propio `manifest.json`; Greener los inyecta en
 * el `<head>` del documento servido (Open Graph, Twitter, canonical, JSON-LD).
 *
 * Opcional SOLO en el tipo porque las versiones publicadas antes de que
 * existiera este bloque no lo tienen; una subida nueva siempre lo exige
 * (`manifestSchema.ts`).
 */
export interface PackageMetadata {
  title: string
  description: string
  /** Código de idioma: `es`, `en`, `ca`, `es-ES`… */
  language: string
  ogImage: {
    /** Ruta dentro del ZIP, siempre bajo `assets/`. */
    path: string
    alt: string
    /** Medidas reales, escritas por el servidor al validar la subida. */
    width?: number
    height?: number
  }
  /** `#rrggbb`. */
  themeColor?: string
  keywords?: string[]
}

export interface PackageManifest {
  kind: 'tool' | 'insight'
  entrypoint: string
  version: number
  requiredCapabilities: string[]
  externalDomains: string[]
  minViewport: { width: number; height: number }
  metadata?: PackageMetadata
}

export interface ResolvedPackage {
  slug: string
  manifest: PackageManifest
  /** HTML del entrypoint, ya listo para componer con el shell (§12.3). */
  html: string
}

export class PackageNotFoundError extends Error {
  constructor(slug: string) {
    super(`No se encontró ningún paquete publicado para "${slug}".`)
    this.name = 'PackageNotFoundError'
  }
}

/** Supabase o Storage han fallado: no sabemos si el paquete existe. */
export class PackageSourceUnavailableError extends Error {
  constructor(slug: string, options?: { cause?: unknown }) {
    super(
      `No se pudo leer el paquete "${slug}" (origen no disponible).`,
      options,
    )
    this.name = 'PackageSourceUnavailableError'
  }
}
