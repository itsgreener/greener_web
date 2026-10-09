import 'server-only'

import { z } from 'zod'

/**
 * Variables de entorno por ÁMBITO, solo de servidor.
 *
 * Antes había un único esquema (`env.ts`) que se validaba entero al
 * importarlo, y `proxy.ts` lo importa: servir CUALQUIER página exigía SMTP,
 * Mailchimp y Cloudmersive, y una variable de newsletter mal escrita tumbaba
 * toda la web. Ahora `env.ts` solo guarda lo que necesita cualquier petición
 * (Supabase, URL del sitio, firma), y cada integración valida lo suyo la
 * primera vez que se usa: si falta una variable de Mailchimp, falla la
 * newsletter, no la home.
 *
 * `validateServerEnv()` (llamada desde `instrumentation.ts`) recorre todos
 * los ámbitos al arrancar y deja un error por cada uno inválido en el log,
 * para que un despliegue mal configurado no espere al primer envío.
 */

// Valor de desarrollo de CONTACT_IP_HASH_SALT. Está en el repo, así que en
// producción NO se acepta: con una sal conocida el hash de la IP es
// reversible por fuerza bruta.
export const DEV_IP_HASH_SALT = 'greener-dev-salt'

// Valor de ejemplo de .env.local.example: tampoco vale en producción.
const EXAMPLE_IP_HASH_SALT = 'fija-una-sal-propia-para-produccion'

function createScopedEnv<S extends z.ZodType>(
  scope: string,
  buildSchema: () => S,
): () => z.infer<S> {
  let cached: z.infer<S> | undefined

  return () => {
    if (cached !== undefined) return cached

    const parsed = buildSchema().safeParse(process.env)

    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors

      console.error(
        `❌ Variables de entorno inválidas o incompletas (${scope}):\n`,
        fieldErrors,
      )
      throw new Error(
        `Configuración de entorno inválida para ${scope}. ` +
          'Revisa el entorno contra .env.local.example.',
      )
    }

    cached = parsed.data
    return cached
  }
}

/** Cloudinary: firmar subidas y consultar la Admin API (arquitectura §5, §9.2). */
export const getCloudinaryEnv = createScopedEnv('Cloudinary', () =>
  z.object({
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
  }),
)

/** Escaneo antivirus de paquetes ZIP subidos (arquitectura §12.5). */
export const getCloudmersiveEnv = createScopedEnv('Cloudmersive', () =>
  z.object({
    CLOUDMERSIVE_API_KEY: z.string().min(1),
  }),
)

/**
 * Formulario de contacto (brief §5.6, arquitectura §14.1): envío por SMTP
 * vía nodemailer a una dirección de Greener.
 */
export const getContactEnv = createScopedEnv('el formulario de contacto', () =>
  z.object({
    CONTACT_SMTP_HOST: z.string().min(1),
    CONTACT_SMTP_PORT: z.coerce.number().int().positive(),
    CONTACT_SMTP_SECURE: z
      .string()
      .default('true')
      .transform((value) => value === 'true'),
    CONTACT_SMTP_USER: z.string().min(1),
    CONTACT_SMTP_PASSWORD: z.string().min(1),
    CONTACT_EMAIL_TO: z.email(),
    CONTACT_EMAIL_FROM: z.email(),
  }),
)

/**
 * Sal del hash de la IP (límite de envíos del contacto y de la newsletter).
 * Obligatoria y propia en producción; en desarrollo y tests hay una por
 * defecto para no tener que configurarla.
 */
export const getIpHashEnv = createScopedEnv('el hash de IP', () =>
  z.object({
    CONTACT_IP_HASH_SALT:
      process.env.NODE_ENV === 'production'
        ? z
            .string()
            .min(16, 'Debe tener al menos 16 caracteres')
            .refine(
              (value) =>
                value !== DEV_IP_HASH_SALT && value !== EXAMPLE_IP_HASH_SALT,
              'No puede ser la sal de desarrollo ni la del ejemplo',
            )
        : z.string().min(1).default(DEV_IP_HASH_SALT),
  }),
)

/** Newsletter: Mailchimp Marketing API (doble opt-in). */
export const getMailchimpEnv = createScopedEnv('Mailchimp', () =>
  z.object({
    MAILCHIMP_API_KEY: z.string().min(1),
    MAILCHIMP_AUDIENCE_ID: z.string().min(1),
    MAILCHIMP_SERVER_PREFIX: z.string().regex(/^us\d+$/, {
      message: 'Debe tener formato usXX (por ejemplo us21)',
    }),
  }),
)

const SCOPES: ReadonlyArray<readonly [string, () => unknown]> = [
  ['Cloudinary', getCloudinaryEnv],
  ['Cloudmersive', getCloudmersiveEnv],
  ['contacto', getContactEnv],
  ['hash de IP', getIpHashEnv],
  ['Mailchimp', getMailchimpEnv],
]

/**
 * Valida todos los ámbitos y devuelve los nombres de los inválidos. No lanza:
 * el servidor sigue sirviendo lo que no depende de ellos (el error de cada
 * ámbito ya se ha escrito en el log con las variables que fallan).
 */
export function validateServerEnv(): string[] {
  const invalid: string[] = []

  for (const [name, getter] of SCOPES) {
    try {
      getter()
    } catch {
      invalid.push(name)
    }
  }

  return invalid
}
