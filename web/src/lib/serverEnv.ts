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

/**
 * Talent (gestión de CVs): el proyecto de Supabase de talent es OTRO distinto
 * al de la web (los datos no se mueven, decisión 1 del plan) y n8n hace parte
 * del trabajo. Solo servidor; ninguna de estas variables llega al navegador.
 *
 * - La clave tiene que ser una clave SECRETA nueva (`sb_secret_…`). Las
 *   heredadas (`service_role`, anon) están desactivadas desde el 19 oct 2026 y
 *   la publicable no sirve para escribir: se rechazan al arrancar en vez de
 *   fallar con un 401 en el primer alta.
 * - Un webhook de n8n por uso. `TALENT_N8N_PROCESS_CV_WEBHOOK_URL` solo lo usa
 *   la subida del personal (ABM, fase 3), por eso es opcional de momento.
 * - La cabecera de autenticación de los webhooks (fase 4) es opcional y va en
 *   pareja: el día que se active la autenticación en n8n basta con rellenar las
 *   dos variables, sin tocar código.
 */
export const getTalentEnv = createScopedEnv('Talent', () =>
  z
    .object({
      TALENT_SUPABASE_URL: z.url(),
      TALENT_SUPABASE_SECRET_KEY: z
        .string()
        .startsWith(
          'sb_secret_',
          'Debe ser una clave secreta nueva (sb_secret_…)',
        ),
      TALENT_N8N_SEND_LINK_WEBHOOK_URL: z.url(),
      TALENT_N8N_PROCESS_FILES_WEBHOOK_URL: z.url(),
      TALENT_N8N_PROCESS_CV_WEBHOOK_URL: z.url().optional(),
      TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME: z.string().min(1).optional(),
      TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE: z.string().min(1).optional(),
    })
    .refine(
      (env) =>
        Boolean(env.TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME) ===
        Boolean(env.TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE),
      {
        message:
          'La cabecera de autenticación de n8n necesita nombre Y valor (o ninguno de los dos)',
        path: ['TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE'],
      },
    ),
)

/**
 * Credencial de la purga por plazo (`POST /api/talent/purge`): al revés que las
 * demás variables de talent, es el secreto con el que n8n llama a la web. Va en
 * su propio ámbito a propósito: si estuviera dentro de `getTalentEnv`, un valor
 * demasiado corto (mínimo 32 caracteres) invalidaría todo el bloque y tumbaría
 * también el formulario de candidatos y el ABM. Así solo cierra la purga, y el
 * log del arranque lo avisa. Sin ella la ruta responde `not_configured`.
 */
export const getTalentPurgeEnv = createScopedEnv('Talent (purga)', () =>
  z.object({
    TALENT_PURGE_SECRET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(32).optional(),
    ),
  }),
)

/**
 * Audiencia de Mailchimp de talent. Es otra audiencia de la MISMA cuenta que la
 * newsletter de Greener (misma clave de API y mismo prefijo, ver
 * `getMailchimpEnv`), así que solo cambia el identificador.
 */
export const getTalentMailchimpEnv = createScopedEnv('Mailchimp (talent)', () =>
  z.object({
    TALENT_MAILCHIMP_AUDIENCE_ID: z.string().min(1),
  }),
)

const SCOPES: ReadonlyArray<readonly [string, () => unknown]> = [
  ['Cloudinary', getCloudinaryEnv],
  ['Cloudmersive', getCloudmersiveEnv],
  ['contacto', getContactEnv],
  ['hash de IP', getIpHashEnv],
  ['Mailchimp', getMailchimpEnv],
  ['Talent', getTalentEnv],
  ['Talent (purga)', getTalentPurgeEnv],
  ['Mailchimp (talent)', getTalentMailchimpEnv],
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
