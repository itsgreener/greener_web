/**
 * Tipos del contrato de paquete HTML de tools/insights (arquitectura §12.2).
 * Puro: no depende de dónde vive físicamente el paquete (disco local en
 * este spike, Supabase Storage en producción — arquitectura §5, §12.2).
 */

export interface PackageManifest {
  kind: 'tool' | 'insight'
  entrypoint: string
  version: number
  requiredCapabilities: string[]
  externalDomains: string[]
  minViewport: { width: number; height: number }
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
