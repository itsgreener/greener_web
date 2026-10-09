import 'server-only'

import { z } from 'zod'

/**
 * Variables de entorno que necesita CUALQUIER petición: Supabase, la URL del
 * sitio, la firma de tokens y la analítica. Se validan al importar este
 * módulo; si falta o es inválida alguna, la app falla de forma explícita en
 * vez de descubrirlo en producción (arquitectura §24.5).
 *
 * Lo que solo usa una integración (Cloudinary, SMTP, Mailchimp,
 * Cloudmersive, sal del hash de IP) vive en `serverEnv.ts` con un getter por
 * ámbito: una variable de newsletter mal puesta ya no tumba toda la web.
 * Las variables públicas que lee el navegador están en `env.client.ts`.
 */
const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),

  // Secreto propio para firmar el cursor del feed y los links de preview
  // (auditoría 8 oct). Opcional por ahora: sin él se usa SUPABASE_SECRET_KEY,
  // como antes. Fijarlo invalida los cursores y previews ya emitidos (24 h y
  // 7 días de vida respectivamente), nada más.
  APP_SIGNING_SECRET: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(32).optional(),
  ),

  // Site
  // Sin barra final: se recorta aquí una sola vez ("https://itsgreener.com/"
  // → "https://itsgreener.com") para que quien la concatena con una ruta
  // que empieza por "/" (link de preview, sitemap, robots) no produzca
  // "//" en mitad de la URL.
  NEXT_PUBLIC_SITE_URL: z
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
      z.flattenError(parsed.error).fieldErrors,
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

  if (
    process.env.NODE_ENV === 'production' &&
    !parsed.data.APP_SIGNING_SECRET
  ) {
    console.warn(
      '⚠ APP_SIGNING_SECRET no está definida: el cursor del feed y los links ' +
        'de preview se firman con SUPABASE_SECRET_KEY. Define un secreto propio ' +
        '(32+ caracteres, sin comillas) en .env.local para no mezclar ambos usos; ' +
        'genéralo con: openssl rand -base64 48',
    )
  }

  return parsed.data
}

export const env = loadEnv()
