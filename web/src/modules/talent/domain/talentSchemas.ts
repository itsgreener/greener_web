import { z } from 'zod'

import {
  EXPERIENCE_VALUES,
  LANGUAGE_KEYS,
  LANGUAGE_LEVELS,
  SOCIAL_KEYS,
  TALENT_TEXT_LIMITS,
  WORK_TYPE_VALUES,
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

/** `esquema:` al principio, salvo que lo siguiente sea un puerto (`host:3000`). */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i

/**
 * Sin esquema se añade `https://`, como hacía el formulario antiguo al salir
 * del campo (`normalizeUrl`): quien escribe `ada.example/portfolio` no tiene
 * que saber qué es un protocolo. Con otro esquema (`javascript:`, `ftp:`,
 * `mailto:`) no se toca y `isHttpUrl` lo rechaza.
 */
function withHttps(value: string) {
  return !value || HAS_SCHEME.test(value) ? value : `https://${value}`
}

const httpUrlSchema = z
  .string()
  .trim()
  .max(TALENT_TEXT_LIMITS.url)
  .transform(withHttps)
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

/**
 * Perfil: valores del formulario (`diseno`, `video`…) o el texto que escribe
 * quien elige «Otro». La palabra `otro` sola no se guarda: la web antigua
 * también la quitaba, y n8n manda a la carpeta `otro` lo que no reconoce.
 */
const profileSchema = z
  .array(z.string().trim().min(1).max(TALENT_TEXT_LIMITS.profileLabel))
  .max(TALENT_TEXT_LIMITS.profiles)
  .transform((values) => {
    const seen = new Set<string>()

    return values.filter((value) => {
      const key = value.toLowerCase()

      if (key === 'otro' || seen.has(key)) return false

      seen.add(key)

      return true
    })
  })
  .refine((values) => values.length > 0, 'Choose at least one role')

/** Idioma (nombre tal cual) → nivel (uno de los cinco del formulario). */
const languagesSchema = z.partialRecord(
  z.enum(LANGUAGE_KEYS),
  z.enum(LANGUAGE_LEVELS),
)

/**
 * Teléfono: el formulario antiguo lo validaba en el navegador con
 * `libphonenumber-js`. Aquí solo se descarta lo que no puede ser un teléfono
 * (letras, símbolos, demasiado corto o largo): 7 a 15 dígitos, que es el rango
 * del plan internacional E.164, con `+`, espacios, puntos, guiones y paréntesis.
 */
function isPlausiblePhone(value: string) {
  if (!/^\+?[\d\s().-]+$/.test(value)) return false

  const digits = value.replace(/\D/g, '').length

  return digits >= 7 && digits <= 15
}

/** Una red sin enlace (cadena vacía) no se guarda. */
const socialsSchema = z.partialRecord(
  z.enum(SOCIAL_KEYS),
  z.union([z.literal(''), httpUrlSchema]),
)

function orNull<T>(value: T | null | undefined): T | null {
  return value ?? null
}

const rateSchema = z
  .number()
  .min(0)
  .max(100_000)
  .nullable()
  .optional()
  .transform((value) => value ?? null)

/**
 * El formulario NO pide el nombre: lo escribe n8n al analizar el CV (la web
 * antigua solo lo leía, para saludar). Por eso no está aquí.
 *
 * El email sí se puede cambiar («¿prefieres cambiarlo?», último paso).
 */
export const candidateFormSchema = z.object({
  email: talentEmailSchema,
  phone: optionalText(TALENT_TEXT_LIMITS.phone).refine(
    (value) => value === null || isPlausiblePhone(value),
    'Enter a valid phone number',
  ),
  comment: optionalText(TALENT_TEXT_LIMITS.comment),
  profile: profileSchema,
  experience: z.enum(EXPERIENCE_VALUES).nullish().transform(orNull),
  workTypes: z
    .array(z.enum(WORK_TYPE_VALUES))
    .default([])
    .transform((values) => [...new Set(values)]),
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
