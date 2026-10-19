import { z } from 'zod'

import {
  LANGUAGE_KEYS,
  PROFILE_VALUES,
  SOCIAL_KEYS,
  TALENT_TEXT_LIMITS,
} from './talentConstants'

/**
 * Esquemas de entrada de las rutas `/api/talent`. El cuerpo del navegador va en
 * camelCase; el paso a las columnas de la base (snake_case) está en
 * `talentRows.ts`.
 */

/** Email normalizado: sin espacios y en minúsculas, que es como se guarda. */
export const talentEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email too long')
  .pipe(z.email('Enter a valid email'))

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)

    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

const httpUrlSchema = z
  .string()
  .trim()
  .max(TALENT_TEXT_LIMITS.url)
  .refine(isHttpUrl, 'Enter a valid link (https://…)')

/** Texto opcional: la cadena vacía es «no ha escrito nada». */
function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null))
}

export const signupSchema = z.object({
  email: talentEmailSchema,
})

export const projectSchema = z.object({
  link: httpUrlSchema,
  comment: optionalText(TALENT_TEXT_LIMITS.projectComment),
})

const profileSchema = z
  .array(z.enum(PROFILE_VALUES))
  .min(1, 'Choose at least one role')
  .max(PROFILE_VALUES.length)
  .transform((values) => [...new Set(values)])

/**
 * El nivel de cada idioma es texto corto: los valores reales que escribe el
 * formulario de hoy no se han verificado (consulta del §7 del contrato). La
 * clave sí se limita a los idiomas conocidos.
 */
const languagesSchema = z.partialRecord(
  z.enum(LANGUAGE_KEYS),
  z.string().trim().min(1).max(TALENT_TEXT_LIMITS.languageLevel),
)

/** Una red sin enlace (cadena vacía) no se guarda. */
const socialsSchema = z.partialRecord(
  z.enum(SOCIAL_KEYS),
  z.union([z.literal(''), httpUrlSchema]),
)

const rateSchema = z
  .number()
  .min(0)
  .max(100_000)
  .nullable()
  .optional()
  .transform((value) => value ?? null)

export const candidateFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter your name')
    .max(TALENT_TEXT_LIMITS.name),
  phone: optionalText(TALENT_TEXT_LIMITS.phone),
  comment: optionalText(TALENT_TEXT_LIMITS.comment),
  profile: profileSchema,
  experience: optionalText(TALENT_TEXT_LIMITS.experience),
  workTypes: z
    .array(z.string().trim().min(1).max(TALENT_TEXT_LIMITS.workTypeLabel))
    .max(TALENT_TEXT_LIMITS.workTypes)
    .default([]),
  rateDay: rateSchema,
  rateHour: rateSchema,
  languages: languagesSchema.default({}),
  socials: socialsSchema.default({}),
  newsletterAccepted: z.boolean().default(false),
  projects: z
    .array(projectSchema)
    .min(1, 'Add at least one project')
    .max(TALENT_TEXT_LIMITS.projects),
})

export type SignupInput = z.output<typeof signupSchema>
export type CandidateFormInput = z.output<typeof candidateFormSchema>

/**
 * Token del enlace (`access_token`). Lo genera el servidor (UUID v4), pero los
 * hay creados por n8n con otro formato: se acepta cualquier cadena de
 * caracteres seguros de longitud razonable, y lo que no encaje es «no existe».
 */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/

export function isWellFormedToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_PATTERN.test(value)
}
