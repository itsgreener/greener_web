import { z } from 'zod'

/**
 * Valida el manifest.json que debe venir dentro de todo paquete ZIP de
 * tool/insight (arquitectura §12.2, §12.5). No sustituye a
 * PackageManifest (domain/manifest.ts) — ese tipo describe el paquete ya
 * resuelto y servido (desde Storage o fixtures/); este schema valida el
 * JSON en crudo tal como llega dentro del ZIP, antes de que exista nada
 * en base de datos.
 */
export const packageManifestSchema = z.object({
  kind: z.enum(['tool', 'insight']),

  entrypoint: z.string().trim().min(1, 'Falta el entrypoint'),

  version: z.number().int().positive(),

  requiredCapabilities: z.array(z.string()),

  externalDomains: z.array(z.string()),

  minViewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
})

export type PackageManifestInput = z.infer<typeof packageManifestSchema>
