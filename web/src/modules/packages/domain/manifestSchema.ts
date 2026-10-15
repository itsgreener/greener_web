import { z } from 'zod'

import { PACKAGE_LIMITS } from './packageLimits'

/**
 * Valida el manifest.json que debe venir dentro de todo paquete ZIP de
 * tool/insight (arquitectura §12.2, §12.5). No sustituye a
 * PackageManifest (domain/manifest.ts) — ese tipo describe el paquete ya
 * resuelto y servido (desde Storage o fixtures/); este schema valida el
 * JSON en crudo tal como llega dentro del ZIP, antes de que exista nada
 * en base de datos.
 *
 * Hay DOS schemas a propósito:
 * - `packageManifestSchema`: el de la SUBIDA. Exige `metadata`.
 * - `storedPackageManifestSchema`: el de la LECTURA de una versión ya
 *   guardada. `metadata` es opcional y, si estuviera mal formada, se ignora
 *   en vez de fallar: las versiones publicadas antes de existir ese bloque
 *   no la tienen y no deben pasar a dar 404 por haber endurecido la subida.
 */

const METADATA = PACKAGE_LIMITS.metadata

/**
 * Ruta de la imagen OG dentro del ZIP: bajo `assets/`, solo caracteres que
 * no necesitan codificarse en una URL (se concatena tal cual a la URL
 * absoluta del `og:image`) y extensión de imagen que los scrapers de redes
 * sociales aceptan.
 */
const OG_IMAGE_PATH =
  /^assets\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.(?:png|jpe?g|webp)$/i

const ogImageSchema = z.object({
  path: z
    .string()
    .trim()
    .regex(
      OG_IMAGE_PATH,
      'debe ser una ruta bajo assets/ (letras, números, ".", "_" y "-") acabada en .png, .jpg, .jpeg o .webp',
    )
    .refine((path) => !path.includes('..'), 'no puede contener ".."'),

  alt: z
    .string()
    .trim()
    .min(1, 'Falta el texto alternativo')
    .max(METADATA.altMax),

  // Los rellena el servidor con las medidas reales; lo que escriba el autor
  // se sobrescribe en zipValidation.
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

const packageMetadataSchema = z.object({
  title: z.string().trim().min(1, 'Falta el título').max(METADATA.titleMax),

  description: z
    .string()
    .trim()
    .min(1, 'Falta la descripción')
    .max(METADATA.descriptionMax),

  language: z
    .string()
    .regex(
      /^[a-z]{2}(?:-[A-Z]{2})?$/,
      'usa un código como "es", "en" o "es-ES"',
    ),

  ogImage: ogImageSchema,

  themeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'usa el formato #rrggbb')
    .optional(),

  keywords: z
    .array(z.string().trim().min(1).max(METADATA.keywordMax))
    .max(METADATA.keywordsMax)
    .optional(),
})

const manifestShape = {
  kind: z.enum(['tool', 'insight']),

  entrypoint: z.string().trim().min(1, 'Falta el entrypoint'),

  version: z.number().int().positive(),

  requiredCapabilities: z.array(z.string()),

  externalDomains: z.array(z.string()),

  minViewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
}

/** Manifest de una SUBIDA: `metadata` obligatoria. */
export const packageManifestSchema = z.object({
  ...manifestShape,
  metadata: packageMetadataSchema,
})

/** Manifest de una versión YA GUARDADA: `metadata` opcional y tolerante. */
export const storedPackageManifestSchema = z.object({
  ...manifestShape,
  metadata: packageMetadataSchema.optional().catch(undefined),
})

export type PackageManifestInput = z.infer<typeof packageManifestSchema>
