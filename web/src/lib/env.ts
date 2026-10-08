import { z } from 'zod'

/**
 * Validación de variables de entorno al arrancar la aplicación.
 * Si falta o es inválida alguna, la app falla de forma explícita
 * en vez de descubrirlo en producción (arquitectura §24.5).
 */
const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),

  // Cloudinary — originales, derivadas y CDN de imagen/vídeo (arquitectura §5, §9.2)
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  // Google OAuth (login del ABM vía Supabase Auth, restringido por dominio — arquitectura §15.2)
  ADMIN_ALLOWED_DOMAIN_FALLBACK: z.string().min(1).optional(),

  // Escaneo antivirus de paquetes ZIP subidos (arquitectura §12.5)
  CLOUDMERSIVE_API_KEY: z.string().min(1),

  // Formulario de contacto (brief §5.6, arquitectura §14.1) — envío por
  // SMTP vía nodemailer a una dirección de Greener. Mailchimp (doble
  // opt-in de newsletter) queda fuera a propósito por ahora, es un
  // formulario/flujo aparte.
  CONTACT_SMTP_HOST: z.string().min(1),
  CONTACT_SMTP_PORT: z.coerce.number().int().positive(),
  CONTACT_SMTP_SECURE: z
    .string()
    .default('true')
    .transform((value) => value === 'true'),
  CONTACT_SMTP_USER: z.string().min(1),
  CONTACT_SMTP_PASSWORD: z.string().min(1),
  CONTACT_EMAIL_TO: z.string().email(),
  CONTACT_EMAIL_FROM: z.string().email(),
  // Sal para el hash de la IP al aplicar el límite de envíos (§14.1) —
  // sin ella, el hash seguiría siendo determinista pero más fácil de
  // revertir por fuerza bruta contra un listado de IPs candidatas. Con
  // un valor por defecto para que dev/test funcionen sin configurarla,
  // pero se recomienda fijar una propia en producción.
  CONTACT_IP_HASH_SALT: z.string().min(1).default('greener-dev-salt'),

  // Newsletter — Mailchimp Marketing API. Estas tres variables son solo
  // de servidor: nunca llevan NEXT_PUBLIC_ y nunca deben llegar al navegador.
  MAILCHIMP_API_KEY: z.string().min(1),
  MAILCHIMP_AUDIENCE_ID: z.string().min(1),
  MAILCHIMP_SERVER_PREFIX: z.string().regex(/^us\d+$/, {
    message: 'Debe tener formato usXX (por ejemplo us21)',
  }),

  // Site
  // Sin barra final: se recorta aquí una sola vez ("https://itsgreener.com/"
  // → "https://itsgreener.com") para que quien la concatena con una ruta
  // que empieza por "/" (link de preview, sitemap, robots) no produzca
  // "//" en mitad de la URL.
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .transform((value) => value.replace(/\/+$/, ''))
    .default('http://localhost:3000'),

  // Analítica (arquitectura §18.2) — Plausible vía @plausible-analytics/
  // tracker. Opcional: sin ella, initAnalytics() no hace nada (ver
  // modules/analytics/analytics.ts) — el sitio sigue funcionando igual,
  // solo no se envían eventos. Solo tiene efecto en producción.
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string().min(1).optional(),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error(
      '❌ Variables de entorno inválidas o incompletas:\n',
      parsed.error.flatten().fieldErrors,
    )
    throw new Error(
      'Configuración de entorno inválida. Revisa .env.local contra .env.local.example.',
    )
  }

  // Valor por defecto silencioso = un fallo que no se ve: en producción,
  // sitemap, robots, hreflang y los links de preview saldrían apuntando a
  // localhost. No se hace obligatoria (rompería builds que hoy funcionan)
  // pero sí se avisa en voz alta al arrancar.
  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.NEXT_PUBLIC_SITE_URL
  ) {
    console.warn(
      '⚠ NEXT_PUBLIC_SITE_URL no está definida: se usa http://localhost:3000. ' +
        'En producción debe ser el dominio público (https://itsgreener.com) — ' +
        'de ello dependen el sitemap, robots.txt, el hreflang y los links de preview.',
    )
  }

  return parsed.data
}

export const env = loadEnv()
